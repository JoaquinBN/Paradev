import type { WorkspaceStore } from "@superset/panes";
import type { StoreApi } from "zustand/vanilla";
import type { DiffPaneData, PaneViewerData } from "../../types";
import {
	NEW_DIFF_PANE,
	openChangesPaneInStore,
} from "../openChangesPaneInStore";

export function openChangesSidebarInStore(
	store: StoreApi<WorkspaceStore<PaneViewerData>>,
	sidebarTab: NonNullable<DiffPaneData["sidebarTab"]> = "changes",
) {
	const state = store.getState();
	const hasChanges = state.tabs.some((tab) =>
		Object.values(tab.panes).some((pane) => pane.kind === "diff"),
	);
	const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
	const candidates = activeTab
		? [activeTab, ...state.tabs.filter((tab) => tab !== activeTab)]
		: state.tabs;
	const terminalTab = candidates.find(
		(tab) =>
			tab.layout.type === "pane" &&
			Object.values(tab.panes)[0]?.kind === "terminal",
	);
	if (!hasChanges && terminalTab?.layout.type === "pane") {
		state.setActiveTab(terminalTab.id);
		state.splitPane({
			tabId: terminalTab.id,
			paneId: terminalTab.layout.paneId,
			position: "top",
			newPane: NEW_DIFF_PANE,
		});
		state.resizeSplit({ tabId: terminalTab.id, path: [], splitPercentage: 65 });
	} else {
		openChangesPaneInStore(store, "tab");
	}
	const current = store.getState();
	const active = current.getActivePane();
	if (active?.pane.kind === "diff")
		current.setPaneData({
			paneId: active.pane.id,
			data: { ...active.pane.data, filter: undefined, sidebarTab },
		});
}
