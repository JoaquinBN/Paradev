import { existsSync, renameSync } from "node:fs";
import path from "node:path";

const APP_NAME = "Wanker";
const LEGACY_APP_NAME = "Superset";
const CHANNEL_SUFFIX = /^( Canary| Dev)?$/;

/**
 * Moves an install's profile from its pre-rename folder ("Superset", "Superset Canary")
 * to the one Electron now derives from the product name. Never overwrites a profile
 * the renamed app has already created. Returns the folder it moved into.
 */
export function moveLegacyUserData({
	appDataDir,
	appName,
}: {
	appDataDir: string;
	appName: string;
}): string | null {
	const suffix = appName.slice(APP_NAME.length);
	if (!appName.startsWith(APP_NAME) || !CHANNEL_SUFFIX.test(suffix))
		return null;
	const legacy = path.join(appDataDir, LEGACY_APP_NAME + suffix);
	const current = path.join(appDataDir, appName);
	if (!existsSync(legacy) || existsSync(current)) return null;
	renameSync(legacy, current);
	return current;
}
