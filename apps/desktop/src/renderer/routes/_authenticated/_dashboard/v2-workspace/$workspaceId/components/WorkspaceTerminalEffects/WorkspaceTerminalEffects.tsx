import { transferAllTabs, type WorkspaceStore } from "@superset/panes";
import { useEffect } from "react";
import type { StoreApi } from "zustand/vanilla";
import { useClearActivePaneAttention } from "../../hooks/useClearActivePaneAttention";
import type { PaneViewerData } from "../../types";
import { dockTerminalPanes } from "../../utils/dockTerminalPanes";

type PaneStore = StoreApi<WorkspaceStore<PaneViewerData>>;

export function WorkspaceTerminalEffects({
	center,
	right,
	dock,
	ready,
	enabled,
	visible,
	onDock,
}: {
	center: PaneStore;
	right: PaneStore;
	dock: PaneStore;
	ready: boolean;
	enabled: boolean;
	visible: boolean;
	onDock: () => void;
}) {
	useClearActivePaneAttention({ store: dock, enabled: visible });
	useEffect(() => {
		if (!ready) return;
		if (!enabled) {
			transferAllTabs({ source: dock, target: center });
			return;
		}
		let disposed = false;
		let queued = false;
		const reconcile = () => {
			if (queued) return;
			queued = true;
			queueMicrotask(() => {
				if (disposed) return;
				if (dockTerminalPanes(center, right, dock)) onDock();
				queued = false;
			});
		};
		reconcile();
		const unsubscribes = [center, right, dock].map((store) =>
			store.subscribe(reconcile),
		);
		unsubscribes.push(
			dock.subscribe((next, previous) => {
				if (next.focusRequest && next.focusRequest !== previous.focusRequest)
					onDock();
			}),
		);
		return () => {
			disposed = true;
			for (const unsubscribe of unsubscribes) unsubscribe();
		};
	}, [center, right, dock, ready, enabled, onDock]);
	return null;
}
