import { describe, expect, test } from "bun:test";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { moveLegacyUserData } from "./legacy-user-data";

function appData(dirs: Record<string, string>): string {
	const root = mkdtempSync(join(tmpdir(), "legacy-user-data-"));
	for (const [dir, marker] of Object.entries(dirs)) {
		mkdirSync(join(root, dir));
		writeFileSync(join(root, dir, "marker"), marker);
	}
	return root;
}

describe("moveLegacyUserData", () => {
	test("moves the pre-rename profile, keeping a channel suffix", () => {
		const root = appData({ Superset: "stable", "Superset Canary": "canary" });
		expect(moveLegacyUserData({ appDataDir: root, appName: "Wanker" })).toBe(
			join(root, "Wanker"),
		);
		expect(
			moveLegacyUserData({ appDataDir: root, appName: "Wanker Canary" }),
		).toBe(join(root, "Wanker Canary"));
		expect(readFileSync(join(root, "Wanker", "marker"), "utf8")).toBe("stable");
		expect(readFileSync(join(root, "Wanker Canary", "marker"), "utf8")).toBe(
			"canary",
		);
		expect(existsSync(join(root, "Superset"))).toBe(false);
	});

	test("never overwrites a profile the renamed app already has", () => {
		const root = appData({ Superset: "old", Wanker: "new" });
		expect(moveLegacyUserData({ appDataDir: root, appName: "Wanker" })).toBe(
			null,
		);
		expect(readFileSync(join(root, "Wanker", "marker"), "utf8")).toBe("new");
		expect(existsSync(join(root, "Superset"))).toBe(true);
	});

	test("leaves dev profiles and fresh installs alone", () => {
		const root = appData({ "Superset (my-workspace)": "dev" });
		expect(
			moveLegacyUserData({
				appDataDir: root,
				appName: "Wanker (my-workspace)",
			}),
		).toBe(null);
		expect(
			moveLegacyUserData({ appDataDir: appData({}), appName: "Wanker" }),
		).toBe(null);
	});
});
