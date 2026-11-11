import { describe, expect, test } from "bun:test";
import { createWorkspaceStore } from "@superset/panes";
import type { DiffPaneData, PaneViewerData } from "../../types";
import { openDiffPaneInStore } from "./openDiffPaneInStore";

describe("main-area diff navigation", () => {
	test("opens review in a separate tab and leaves the conversation layout intact", () => {
		const store = createWorkspaceStore<PaneViewerData>();
		store.getState().addTab({
			panes: [
				{
					kind: "chat-v3",
					data: { terminalId: "agent", sessionId: "session" },
				},
			],
		});
		const chat = store.getState().tabs[0];
		openDiffPaneInStore(store, {
			path: "a.ts",
			placement: "tab",
			filter: { scope: "file", paths: ["a.ts"] },
		});
		expect(store.getState().tabs).toHaveLength(2);
		expect(store.getState().tabs[0]).toEqual(chat);
		expect(store.getState().getActivePane()?.pane.data).toMatchObject({
			path: "a.ts",
			filter: { scope: "file", paths: ["a.ts"] },
		});
	});
	test("reuses review, resets line and turn filters, and preserves unrelated collapsed files", () => {
		const store = createWorkspaceStore<PaneViewerData>();
		store.getState().addTab({
			panes: [
				{
					kind: "diff",
					data: {
						path: "a.ts",
						collapsedFiles: ["b", "c"],
						focusLine: 12,
						focusSide: "deletions",
						filter: {
							paths: ["a.ts"],
							range: { fromHash: "old", toHash: "new" },
						},
					},
				},
			],
		});
		const paneId = store.getState().getActivePane()?.pane.id;
		openDiffPaneInStore(store, {
			path: "b.ts",
			changeKey: "b",
			placement: "tab",
		});
		expect(store.getState().tabs).toHaveLength(1);
		expect(store.getState().getActivePane()?.pane.id).toBe(paneId);
		const data = store.getState().getActivePane()?.pane.data as DiffPaneData;
		expect(data.path).toBe("b.ts");
		expect(data.collapsedFiles).toEqual(["c"]);
		expect(data.filter).toBeUndefined();
		expect(data.focusLine).toBeUndefined();
		expect(data.focusSide).toBeUndefined();
	});
	test("an explicit new-tab request keeps the current review and carries line context", () => {
		const store = createWorkspaceStore<PaneViewerData>();
		openDiffPaneInStore(store, { path: "a.ts", placement: "tab" });
		openDiffPaneInStore(store, {
			path: "b.ts",
			openInNewTab: true,
			line: 12,
			side: "deletions",
			changeKey: "staged:b.ts",
		});
		expect(store.getState().tabs).toHaveLength(2);
		expect(store.getState().getActivePane()?.pane.data).toMatchObject({
			path: "b.ts",
			focusLine: 12,
			focusSide: "deletions",
			changeKey: "staged:b.ts",
		});
	});
	test("keeps pane placement as the default for other callers", () => {
		const store = createWorkspaceStore<PaneViewerData>();
		store
			.getState()
			.addTab({ panes: [{ kind: "terminal", data: { terminalId: "shell" } }] });
		const tabId = store.getState().activeTabId;
		openDiffPaneInStore(store, { path: "a.ts" });
		expect(store.getState().tabs).toHaveLength(1);
		expect(store.getState().activeTabId).toBe(tabId);
		expect(store.getState().getActivePane()?.pane.kind).toBe("diff");
	});
});
