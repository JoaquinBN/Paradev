import {
	transferPaneToNewTab,
	transferTabToIndex,
	type WorkspaceStore,
} from "@superset/panes";
import type { StoreApi } from "zustand/vanilla";
import type { PaneViewerData } from "../../types";

type PaneStore = StoreApi<WorkspaceStore<PaneViewerData>>;

export function dockTerminalPanes(
	center: PaneStore,
	right: PaneStore,
	dock: PaneStore,
): boolean {
	let moved = false;
	for (const source of [right, center]) {
		for (const tab of source.getState().tabs) {
			const panes = Object.values(tab.panes);
			if (panes.length > 0 && panes.every((pane) => pane.kind === "terminal")) {
				transferTabToIndex({ source, target: dock, tabId: tab.id });
				moved = true;
			} else if (source === right) {
				for (const pane of panes) {
					if (pane.kind !== "terminal") continue;
					transferPaneToNewTab({ source, target: dock, paneId: pane.id });
					moved = true;
				}
			}
		}
	}
	for (const tab of dock.getState().tabs) {
		const panes = Object.values(tab.panes);
		if (panes.every((pane) => pane.kind !== "terminal")) {
			transferTabToIndex({ source: dock, target: center, tabId: tab.id });
		} else {
			for (const pane of panes) {
				if (pane.kind === "terminal") continue;
				transferPaneToNewTab({ source: dock, target: center, paneId: pane.id });
			}
		}
	}
	return moved;
}
