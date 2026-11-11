import { describe, expect, it } from "bun:test";
import { toAppDisplayName } from "./app-display-name";

describe("toAppDisplayName", () => {
	it("keeps every app name unchanged with the default display name", () => {
		for (const name of ["Wanker", "Wanker Canary", "Wanker (my-branch)"]) {
			expect(toAppDisplayName(name, "Wanker")).toBe(name);
		}
	});

	it("swaps only the product name and keeps the suffix", () => {
		expect(toAppDisplayName("Wanker", "Wanker Beta")).toBe("Wanker Beta");
		expect(toAppDisplayName("Wanker Canary", "Wanker Beta")).toBe(
			"Wanker Beta Canary",
		);
		expect(toAppDisplayName("Wanker (my-branch)", "Wanker Beta")).toBe(
			"Wanker Beta (my-branch)",
		);
	});

	it("leaves a name without the product name alone", () => {
		expect(toAppDisplayName("Electron", "Wanker")).toBe("Electron");
	});
});
