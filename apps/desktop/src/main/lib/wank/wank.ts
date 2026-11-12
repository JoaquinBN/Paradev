import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { getBinDir, resolveAppHomeDir } from "@superset/agent-setup/paths";
import { i18n } from "@superset/i18n";
import { app } from "electron";
import { getProcessEnvWithShellPath } from "lib/trpc/routers/workspaces/utils/shell-env";
import { env } from "main/env.main";
import { PROTOCOL_SCHEME } from "shared/constants";

const HELPER = "Wank.app/Contents/MacOS/Wank";
const MAX_RESTARTS = 3;

type WankMessage = { type: "record" } | { type: "organization"; id: string };

let child: ChildProcess | null = null;
let restarts = 0;
let stopping = false;

/** Wank, the notch helper bundled in Resources/bin, records demos and builds automations from them. */
function findWankExecutable({
	isPackaged,
	resourcesPath,
	appPath,
}: {
	isPackaged: boolean;
	resourcesPath: string;
	appPath: string;
}): string | null {
	if (process.platform !== "darwin") return null;
	const candidate = isPackaged
		? path.join(resourcesPath, "resources/bin", HELPER)
		: path.join(appPath, "dist/resources/bin", HELPER);
	return existsSync(candidate) ? candidate : null;
}

export async function startWank(): Promise<void> {
	const executable = findWankExecutable({
		isPackaged: app.isPackaged,
		resourcesPath: process.resourcesPath,
		appPath: app.getAppPath(),
	});
	if (!executable || child) return;
	const childEnv = {
		...(await getProcessEnvWithShellPath()),
		SUPERSET_HOME_DIR: resolveAppHomeDir(),
		SUPERSET_API_URL: env.NEXT_PUBLIC_API_URL,
		WANK_CLI: path.join(getBinDir(), "superset"),
		WANK_APP_URL: `${PROTOCOL_SCHEME}://`,
		WANK_LOCALE: i18n.locale,
	};
	const started = spawn(executable, [], {
		env: childEnv,
		stdio: ["pipe", "pipe", "pipe"],
	});
	child = started;
	const log = (data: Buffer) =>
		console.log(`[wank] ${data.toString().trimEnd()}`);
	started.stdout?.on("data", log);
	started.stderr?.on("data", log);
	started.on("exit", (code) => {
		child = null;
		if (stopping || restarts >= MAX_RESTARTS) return;
		restarts += 1;
		console.warn(
			`[wank] exited with ${code}; restarting (${restarts}/${MAX_RESTARTS})`,
		);
		void startWank();
	});
}

export function stopWank(): void {
	stopping = true;
	child?.kill();
	child = null;
}

/** False when Wank isn't running: not macOS, or the app was built without it. */
export function sendToWank(message: WankMessage): boolean {
	if (!child?.stdin?.writable) return false;
	child.stdin.write(`${JSON.stringify(message)}\n`);
	return true;
}
