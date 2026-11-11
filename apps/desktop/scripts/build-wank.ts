import { spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	statSync,
} from "node:fs";
import { join, resolve } from "node:path";

const desktopDir = resolve(import.meta.dirname, "..");
const packageDir = resolve(desktopDir, "native/wank");
const appDir = resolve(desktopDir, "dist/resources/bin/Wank.app");
const executable = join(appDir, "Contents/MacOS/Wank");

function main() {
	if ((process.env.TARGET_PLATFORM ?? process.platform) !== "darwin") {
		console.log("[wank] skipped: macOS only");
		return;
	}
	if (isUpToDate()) {
		console.log("[wank] up to date");
		return;
	}
	const build = spawnSync(
		"swift",
		["build", "-c", "release", "--package-path", packageDir],
		{ stdio: "inherit" },
	);
	if (build.status !== 0) {
		// Wank needs the macOS 26 SDK. Without it the app ships without Wank, and "Have a wank" says so.
		console.warn(
			`[wank] skipped: swift build exited with ${build.status ?? build.error?.message}`,
		);
		return;
	}
	rmSync(appDir, { recursive: true, force: true });
	mkdirSync(join(appDir, "Contents/MacOS"), { recursive: true });
	mkdirSync(join(appDir, "Contents/Resources"), { recursive: true });
	cpSync(join(packageDir, ".build/release/Wank"), executable);
	cpSync(join(packageDir, "Info.plist"), join(appDir, "Contents/Info.plist"));
	cpSync(
		join(packageDir, "Resources/compiler.md"),
		join(appDir, "Contents/Resources/compiler.md"),
	);
	console.log(`[wank] built ${appDir}`);
}

function isUpToDate(): boolean {
	if (process.env.CI || process.env.TARGET_ARCH || !existsSync(executable))
		return false;
	const built = statSync(executable).mtimeMs;
	const inputs = [
		join(packageDir, "Package.swift"),
		join(packageDir, "Info.plist"),
		...listFiles(join(packageDir, "Sources")),
		...listFiles(join(packageDir, "Resources")),
	];
	return inputs.every((input) => statSync(input).mtimeMs < built);
}

function listFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory()
			? listFiles(join(dir, entry.name))
			: [join(dir, entry.name)],
	);
}

main();
