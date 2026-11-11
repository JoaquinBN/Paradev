import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkDesign, surfaces } from "./check";

const root = resolve(import.meta.dir, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("upstream desktop design compatibility", () => {
	test("the current integration resolves", () => {
		expect(checkDesign(read)).toEqual([]);
	});
	test("a renamed upstream primitive fails with an actionable error", () => {
		const errors = checkDesign((path) =>
			path.endsWith("/ui/dialog.tsx")
				? read(path).replaceAll(
						'data-slot="dialog-content"',
						'data-slot="modal-content"',
					)
				: read(path),
		);
		expect(errors).toContain(
			"Upstream removed or renamed the dialog-content primitive slot",
		);
	});
	test("a replaced feature component cannot silently lose its design", () => {
		const errors = checkDesign((path) =>
			path === surfaces.composer[0]
				? "export const Composer = () => null;"
				: read(path),
		);
		expect(errors).toContain(
			`Missing composer surface in ${surfaces.composer[0]}`,
		);
	});
});
