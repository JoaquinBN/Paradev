import type { WorkspaceStore } from "@superset/panes";
import type { StoreApi } from "zustand/vanilla";
import { createRightPane } from "../../components/RightPaneNewTab/paneOptions";
import type { PaneViewerData } from "../../types";

export function openTerminalDock(
	store: StoreApi<WorkspaceStore<PaneViewerData>>,
	mintTerminalId: () => string,
	create = false,
) {
	const state = store.getState();
	const active = state.getActivePane();
	if (!create && active?.pane.kind === "terminal") {
		state.focusPane(active.pane.id);
		return;
	}
	state.addTab({
		panes: [createRightPane("terminal", { mintTerminalId, browserUrl: "" })],
	});
}
