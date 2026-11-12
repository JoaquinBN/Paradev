import { describe, expect, test } from "bun:test";
import { parseWankFlow } from "./parseWankFlow";

describe("parseWankFlow", () => {
	test("reads the flow Wank embeds, keeping only valid nodes", () => {
		const prompt = `Do the thing.\n\n<!-- wank-flow {"nodes":[{"kind":"trigger","title":"Daily 9:00"},{"kind":"parallel","title":"Review","items":["Opus","GPT"]},{"kind":"bogus","title":"x"}]} -->`;
		expect(parseWankFlow(prompt, "unused")).toEqual([
			{ kind: "trigger", title: "Daily 9:00" },
			{ kind: "parallel", title: "Review", items: ["Opus", "GPT"] },
		]);
	});

	test("falls back to numbered steps under the trigger", () => {
		const prompt =
			"## Goal\nStuff\n\n## Steps\n1. **Find PRs**: open ones by me\n2. Write the verdict\n\n## Output\nA file";
		expect(parseWankFlow(prompt, "Every 15 min")).toEqual([
			{ kind: "trigger", title: "Every 15 min" },
			{ kind: "step", title: "Find PRs", detail: "open ones by me" },
			{ kind: "step", title: "Write the verdict" },
		]);
	});

	test("is just the trigger when the prompt has neither", () => {
		expect(parseWankFlow("Summarize my inbox.", "Runs on demand")).toEqual([
			{ kind: "trigger", title: "Runs on demand" },
		]);
	});
});
