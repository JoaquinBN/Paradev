import type { StoreApi } from "zustand/vanilla";
import type { WorkspaceStore } from "../../../../../core/store";

export function separatePaneTabs<TData>(
	store: StoreApi<WorkspaceStore<TData>>,
): void {
	const { tabs, activeTabId } = store.getState();
	let changed = false;
	for (const tab of tabs) {
		const panes = Object.values(tab.panes);
		if (panes.length < 2) continue;
		const keptPaneId = tab.activePaneId ?? panes[0]?.id;
		let index =
			store.getState().tabs.findIndex((entry) => entry.id === tab.id) + 1;
		for (const pane of panes) {
			if (pane.id === keptPaneId) continue;
			store.getState().movePaneToNewTab({ paneId: pane.id, toIndex: index++ });
			changed = true;
		}
	}
	if (changed && activeTabId) store.getState().setActiveTab(activeTabId);
}
