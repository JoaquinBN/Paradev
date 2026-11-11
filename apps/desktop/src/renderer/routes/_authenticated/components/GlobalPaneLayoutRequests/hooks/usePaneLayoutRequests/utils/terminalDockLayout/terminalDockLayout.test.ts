import { expect, test } from "bun:test";
import { createWorkspaceStore } from "@superset/panes";
import type { PaneViewerData } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";
import { applyPaneLayoutOp } from "../applyPaneLayoutOp";
import { joinSidebarLayouts, splitSidebarLayout } from "./terminalDockLayout";

test("CLI focus and close find dock sessions while preserving the selected review view", () => {
	const main = createWorkspaceStore<PaneViewerData>().getState();
	const sideStore = createWorkspaceStore<PaneViewerData>();
	sideStore.getState().addTab({
		panes: [{ kind: "diff", data: { path: "", collapsedFiles: [] } }],
	});
	const dockStore = createWorkspaceStore<PaneViewerData>();
	dockStore
		.getState()
		.addTab({ panes: [{ kind: "terminal", data: { terminalId: "shell" } }] });
	const sidebar = sideStore.getState(),
		dock = dockStore.getState();
	const paneId = dock.getActivePane()?.pane.id;
	if (!paneId) throw Error("Expected terminal");
	const combined = joinSidebarLayouts(sidebar, dock);
	const focused = applyPaneLayoutOp(
		{ main, sidebar: combined },
		{ type: "focus", paneId },
	);
	const separated = splitSidebarLayout(focused.areas.sidebar, {
		sidebar,
		dock,
	});
	expect(separated.sidebar.activeTabId).toBe(sidebar.activeTabId);
	expect(separated.dock.tabs).toEqual(dock.tabs);
	expect(separated.dock.activeTabId).toBe(dock.activeTabId);
	const closed = applyPaneLayoutOp(focused.areas, { type: "close", paneId });
	const afterClose = splitSidebarLayout(closed.areas.sidebar, {
		sidebar,
		dock,
	});
	expect(afterClose.dock.tabs).toHaveLength(0);
	expect(afterClose.sidebar.tabs).toEqual(sidebar.tabs);
});
