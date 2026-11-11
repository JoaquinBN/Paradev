import type { WorkspaceStore } from "@superset/panes";
import type { StoreApi } from "zustand/vanilla";
import type {
	DiffFocusSide,
	DiffPaneData,
	DiffPaneFilter,
	PaneViewerData,
} from "../../types";

export function openDiffPaneInStore(
	store: StoreApi<WorkspaceStore<PaneViewerData>>,
	{
		path,
		openInNewTab,
		line,
		side,
		changeKey,
		filter,
		placement = "pane",
	}: {
		path: string;
		openInNewTab?: boolean;
		line?: number;
		side?: DiffFocusSide;
		changeKey?: string;
		filter?: DiffPaneFilter;
		placement?: "pane" | "tab";
	},
) {
	const state = store.getState();
	const focusFields = {
		focusLine: line,
		focusSide: line != null ? side : undefined,
		focusTick: Date.now(),
		filter,
	};
	if (!openInNewTab) {
		for (const tab of state.tabs) {
			for (const pane of Object.values(tab.panes)) {
				if (pane.kind !== "diff") continue;
				const previous = pane.data as DiffPaneData;
				state.setPaneData({
					paneId: pane.id,
					data: {
						...previous,
						path,
						changeKey,
						...focusFields,
						collapsedFiles: changeKey
							? (previous.collapsedFiles ?? []).filter(
									(key) => key !== changeKey,
								)
							: (previous.collapsedFiles ?? []),
					},
				});
				state.focusPane(pane.id);
				return;
			}
		}
	}
	const pane = {
		kind: "diff",
		data: { path, changeKey, collapsedFiles: [], ...focusFields },
	};
	if (openInNewTab || placement === "tab") state.addTab({ panes: [pane] });
	else state.openPane({ pane });
}
