import { describe, expect, test } from "bun:test";
import { createWorkspaceStore } from "@superset/panes";
import type { DiffPaneData, PaneViewerData } from "../../types";
import { closeVisibleChangesPane } from "../openChangesPaneInStore";
import { openTerminalDock } from "../openTerminalDock";
import { openChangesSidebarInStore } from "./openChangesSidebarInStore";

describe("changes sidebar navigation", () => {
	test("puts the file list above a terminal opened first and restores it after closing", () => {
		const store = createWorkspaceStore<PaneViewerData>();
		openTerminalDock(store, () => "shell");
		const terminalId = store.getState().getActivePane()?.pane.id;
		if (!terminalId) throw Error("Expected terminal");
		store.getState().addTab({
			panes: [
				{ kind: "file", data: { filePath: "README.md", mode: "editor" } },
			],
		});
		const otherTab = store.getState().tabs[1];
		for (let i = 0; i < 2; i++) {
			openChangesSidebarInStore(store);
			const tab = store.getState().tabs[0];
			expect(store.getState().tabs).toHaveLength(2);
			expect(store.getState().tabs[1]).toEqual(otherTab);
			expect(store.getState().activeTabId).toBe(tab?.id);
			expect(tab?.layout).toMatchObject({
				type: "split",
				direction: "vertical",
				splitPercentage: 65,
				second: { type: "pane", paneId: terminalId },
			});
			expect(store.getState().getActivePane()?.pane.kind).toBe("diff");
			expect(tab?.panes[terminalId]?.data).toEqual({
				terminalId: "shell",
				createOnAttach: true,
			});
			closeVisibleChangesPane(store);
		}
	});
	test("changes sidebar tabs without adding panes or replacing the terminal", () => {
		const store = createWorkspaceStore<PaneViewerData>();
		openChangesSidebarInStore(store);
		const sidebar = store.getState().getActivePane();
		if (!sidebar) throw Error("Expected sidebar");
		store.getState().splitPane({
			tabId: sidebar.tabId,
			paneId: sidebar.pane.id,
			position: "bottom",
			newPane: {
				kind: "terminal",
				data: { terminalId: "shell", createOnAttach: true },
			},
		});
		const panes = Object.keys(store.getState().tabs[0]?.panes ?? {});
		expect(panes).toHaveLength(2);
		openChangesSidebarInStore(store, "files");
		expect(Object.keys(store.getState().tabs[0]?.panes ?? {})).toEqual(panes);
		expect(
			(store.getState().getActivePane()?.pane.data as DiffPaneData).sidebarTab,
		).toBe("files");
		openChangesSidebarInStore(store);
		expect(Object.keys(store.getState().tabs[0]?.panes ?? {})).toEqual(panes);
		expect(
			(store.getState().getActivePane()?.pane.data as DiffPaneData).sidebarTab,
		).toBe("changes");
	});
	test("opening all changes clears an old turn filter", () => {
		const store = createWorkspaceStore<PaneViewerData>();
		store.getState().addTab({
			panes: [
				{
					kind: "diff",
					data: {
						path: "a.ts",
						collapsedFiles: ["b"],
						filter: { paths: ["a.ts"] },
					},
				},
			],
		});
		openChangesSidebarInStore(store);
		expect(store.getState().tabs).toHaveLength(1);
		expect(store.getState().getActivePane()?.pane.data).toMatchObject({
			filter: undefined,
			collapsedFiles: ["b"],
			sidebarTab: "changes",
		});
	});
});
