import { describe, expect, test } from "bun:test";
import {
	buildNavigationSections,
	type NavigationFolder,
} from "./buildNavigationSections";

const folder = (patch: Partial<NavigationFolder>): NavigationFolder => ({
	sectionId: "project-a:work",
	projectId: "project-a",
	tag: "work",
	name: "Work",
	color: null,
	isCollapsed: false,
	createdAt: new Date(1),
	...patch,
});

describe("navigation sections", () => {
	test("combines matching tags across projects and sessions without changing their identities", () => {
		const folders = [
			folder({}),
			folder({ sectionId: "project-b:work", projectId: "project-b" }),
			folder({ sectionId: "sessions:work", projectId: "sessions" }),
		];
		const sections = buildNavigationSections(folders);
		expect(sections).toHaveLength(1);
		expect(sections[0]?.folders).toEqual(folders);
	});

	test("keeps an edited section name when a new project's tag creates a derived folder", () => {
		const result = buildNavigationSections([
			folder({ name: "In progress", isCollapsed: true }),
			folder({
				sectionId: "project-b:work",
				projectId: "project-b",
				name: "work",
				isDerived: true,
				createdAt: new Date(0),
			}),
		]);
		expect(result[0]?.name).toBe("In progress");
		expect(result[0]?.isCollapsed).toBe(false);
	});

	test("accepts dates restored from persisted collection rows", () => {
		expect(
			buildNavigationSections([
				folder({ createdAt: new Date(2).toISOString() }),
				folder({
					sectionId: "project-b:work",
					projectId: "project-b",
					createdAt: new Date(1).toISOString(),
				}),
			])[0]?.folders[0]?.projectId,
		).toBe("project-b");
	});

	test("keeps legacy folders with the same name separate until tag migration", () => {
		expect(
			buildNavigationSections([
				folder({ tag: null, sectionId: "legacy-a" }),
				folder({ tag: null, sectionId: "legacy-b" }),
			]),
		).toHaveLength(2);
	});
});
