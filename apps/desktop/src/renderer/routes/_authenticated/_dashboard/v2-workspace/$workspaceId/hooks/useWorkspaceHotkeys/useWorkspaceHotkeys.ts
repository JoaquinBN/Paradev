import {
	type FocusDirection,
	getSpatialNeighborPaneId,
	type PaneRegistry,
	type WorkspaceProps,
	type WorkspaceStore,
} from "@superset/panes";
import { useCallback, useMemo, useRef } from "react";
import { useHotkey } from "renderer/hotkeys";
import type { V2TerminalPresetRow } from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal";
import type { StoreApi } from "zustand";
import {
	createRightPane,
	type RightPaneKind,
} from "../../components/RightPaneNewTab";
import {
	type BrowserPaneData,
	NEW_TAB_PANE_KIND,
	type PaneTarget,
	type PaneViewerData,
} from "../../types";
import { cycleActiveTab } from "../../utils/cycleActiveTab";
import { replaceNewTabPane } from "../../utils/replaceNewTabPane";
import { useDefaultBrowserUrl } from "../useDefaultBrowserUrl";
import type { TerminalLauncher } from "../useV2TerminalLauncher";

export function useWorkspaceHotkeys({
	viewer,
	matchedPresets,
	executePreset,
	addTerminalTab,
	openChangesPane,
	paneRegistry,
	launcher,
	getCloseTarget,
}: {
	viewer: PaneTarget;
	matchedPresets: V2TerminalPresetRow[];
	executePreset: (preset: V2TerminalPresetRow) => void | Promise<void>;
	addTerminalTab: () => Promise<void>;
	openChangesPane: () => void;
	paneRegistry: PaneRegistry<PaneViewerData>;
	launcher: TerminalLauncher;
	getCloseTarget: () => {
		store: StoreApi<WorkspaceStore<PaneViewerData>>;
		onBeforeCloseTab?: WorkspaceProps<PaneViewerData>["onBeforeCloseTab"];
	};
}) {
	const defaultBrowserUrl = useDefaultBrowserUrl();
	const visiblePresets = useMemo(
		() => matchedPresets.filter((preset) => preset.pinnedToBar !== false),
		[matchedPresets],
	);

	// --- Tab creation ---

	const replaceFocusedNewTab = (kind: RightPaneKind): boolean => {
		const target = getCloseTarget().store;
		const active = target.getState().getActivePane();
		if (active?.pane.kind !== NEW_TAB_PANE_KIND) return false;
		replaceNewTabPane(
			target,
			{ tabId: active.tabId, paneId: active.pane.id },
			createRightPane(kind, {
				mintTerminalId: launcher.mint,
				browserUrl: defaultBrowserUrl,
			}),
		);
		return true;
	};

	useHotkey("NEW_GROUP", async () => {
		if (replaceFocusedNewTab("terminal")) return;
		await addTerminalTab();
	});

	useHotkey("NEW_BROWSER", () => {
		if (replaceFocusedNewTab("browser")) return;
		viewer.reveal();
		viewer.store.getState().addTab({
			panes: [
				{
					kind: "browser",
					data: {
						url: defaultBrowserUrl,
					} as BrowserPaneData,
				},
			],
		});
	});

	useHotkey("OPEN_DIFF_VIEWER", () => {
		if (replaceFocusedNewTab("diff")) return;
		openChangesPane();
	});

	// --- Tab management ---

	const isClosingPaneRef = useRef(false);
	useHotkey("CLOSE_PANE", async () => {
		if (isClosingPaneRef.current) return;
		isClosingPaneRef.current = true;
		try {
			const state = getCloseTarget().store.getState();
			const active = state.getActivePane();
			if (!active) return;
			const definition = paneRegistry[active.pane.kind];
			if (definition?.onBeforeClose) {
				const allowed = await definition.onBeforeClose(active.pane);
				if (!allowed) return;
			}
			state.closePane({ tabId: active.tabId, paneId: active.pane.id });
		} finally {
			isClosingPaneRef.current = false;
		}
	});

	const isClosingTabRef = useRef(false);
	useHotkey("CLOSE_TAB", async () => {
		if (isClosingTabRef.current) return;
		isClosingTabRef.current = true;
		try {
			const { store: targetStore, onBeforeCloseTab } = getCloseTarget();
			const state = targetStore.getState();
			const tab = state.getActiveTab();
			if (!tab) return;
			if (onBeforeCloseTab) {
				const allowed = await onBeforeCloseTab(tab);
				if (!allowed) return;
			}
			state.removeTab(tab.id);
		} finally {
			isClosingTabRef.current = false;
		}
	});

	useHotkey("PREV_TAB", () => cycleActiveTab(getCloseTarget().store, -1));
	useHotkey("NEXT_TAB", () => cycleActiveTab(getCloseTarget().store, 1));
	useHotkey("PREV_TAB_ALT", () => cycleActiveTab(getCloseTarget().store, -1));
	useHotkey("NEXT_TAB_ALT", () => cycleActiveTab(getCloseTarget().store, 1));

	const switchToTab = useCallback(
		(index: number) => {
			const state = getCloseTarget().store.getState();
			const tab = state.tabs[index];
			if (tab) state.setActiveTab(tab.id);
		},
		[getCloseTarget],
	);

	useHotkey("JUMP_TO_TAB_1", () => switchToTab(0));
	useHotkey("JUMP_TO_TAB_2", () => switchToTab(1));
	useHotkey("JUMP_TO_TAB_3", () => switchToTab(2));
	useHotkey("JUMP_TO_TAB_4", () => switchToTab(3));
	useHotkey("JUMP_TO_TAB_5", () => switchToTab(4));
	useHotkey("JUMP_TO_TAB_6", () => switchToTab(5));
	useHotkey("JUMP_TO_TAB_7", () => switchToTab(6));
	useHotkey("JUMP_TO_TAB_8", () => switchToTab(7));
	useHotkey("JUMP_TO_TAB_9", () => switchToTab(8));

	// --- Pane management ---

	const moveFocusDirectional = useCallback(
		(dir: FocusDirection) => {
			const state = getCloseTarget().store.getState();
			const tab = state.getActiveTab();
			if (!tab || !tab.activePaneId) return;
			const neighbor = getSpatialNeighborPaneId(
				tab.layout,
				tab.activePaneId,
				dir,
			);
			if (neighbor) state.setActivePane({ tabId: tab.id, paneId: neighbor });
		},
		[getCloseTarget],
	);

	useHotkey("FOCUS_PANE_LEFT", () => moveFocusDirectional("left"));
	useHotkey("FOCUS_PANE_RIGHT", () => moveFocusDirectional("right"));
	useHotkey("FOCUS_PANE_UP", () => moveFocusDirectional("up"));
	useHotkey("FOCUS_PANE_DOWN", () => moveFocusDirectional("down"));

	// --- Preset hotkeys ---

	const openPresetByIndex = useCallback(
		(index: number) => {
			const preset = visiblePresets[index];
			if (preset) executePreset(preset);
		},
		[visiblePresets, executePreset],
	);

	useHotkey("OPEN_PRESET_1", () => openPresetByIndex(0));
	useHotkey("OPEN_PRESET_2", () => openPresetByIndex(1));
	useHotkey("OPEN_PRESET_3", () => openPresetByIndex(2));
	useHotkey("OPEN_PRESET_4", () => openPresetByIndex(3));
	useHotkey("OPEN_PRESET_5", () => openPresetByIndex(4));
	useHotkey("OPEN_PRESET_6", () => openPresetByIndex(5));
	useHotkey("OPEN_PRESET_7", () => openPresetByIndex(6));
	useHotkey("OPEN_PRESET_8", () => openPresetByIndex(7));
	useHotkey("OPEN_PRESET_9", () => openPresetByIndex(8));
}
