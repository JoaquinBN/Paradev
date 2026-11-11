import {
	type ContextMenuActionConfig,
	type PaneActionConfig,
	type PaneRegistry,
	type Tab,
	Workspace,
	type WorkspaceInteractionState,
	type WorkspaceStore,
} from "@superset/panes";
import { Tabs, TabsContent } from "@superset/ui/tabs";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useWankerShell } from "renderer/hooks/useWankerShell";
import type { OpenPullRequestPane } from "renderer/lib/github/openPullRequestLink";
import { reportRendererError } from "renderer/lib/report-renderer-error";
import { WindowChrome } from "renderer/routes/_authenticated/_dashboard/components/WindowChrome";
import {
	titleBarTabBarProps,
	useTitleBarSideSlot,
} from "renderer/routes/_authenticated/_dashboard/providers/TitleBarSlotsProvider";
import { useWorkspace } from "renderer/routes/_authenticated/_dashboard/v2-workspace/providers/WorkspaceProvider";
import { getV2NotificationSourcesForTab } from "renderer/stores/v2-notifications";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import { useNewTabLists } from "../../hooks/useNewTabLists";
import { renderBrowserTabIcon } from "../../hooks/usePaneRegistry/components/BrowserPane";
import type { DiffPaneData, PaneViewerData } from "../../types";
import { openChangesSidebarInStore } from "../../utils/openChangesSidebarInStore";
import { NEW_TAB_PANE } from "../RightPaneNewTab";
import { V2NotificationStatusIndicator } from "../V2NotificationStatusIndicator";
import { PullRequestCountsPrefetch } from "./components/PullRequestCountsPrefetch";
import { RightPaneNavigation } from "./components/RightPaneNavigation";
import { WorkspaceReviewHeader } from "./components/WorkspaceReviewHeader";

const RIGHT_PANE_KEPT_TABS = 2;

function isPreviewTab(tab: Tab<PaneViewerData>): boolean {
	const panes = Object.values(tab.panes);
	return panes.length === 1 && panes[0]?.kind === "file" && !panes[0].pinned;
}

function findSidebarPane(tab: Tab<PaneViewerData> | undefined) {
	if (!tab) return undefined;
	const panes = Object.values(tab.panes);
	const focused = tab.activePaneId ? tab.panes[tab.activePaneId] : undefined;
	if (focused?.kind === "diff" && !(focused.data as DiffPaneData).filter)
		return focused;
	return panes.find(
		(pane) => pane.kind === "diff" && !(pane.data as DiffPaneData).filter,
	);
}

interface RightPaneAreaProps {
	store: StoreApi<WorkspaceStore<PaneViewerData>>;
	registry: PaneRegistry<PaneViewerData>;
	paneActions: PaneActionConfig<PaneViewerData>[];
	contextMenuActions: ContextMenuActionConfig<PaneViewerData>[];
	onBeforeCloseTab: (tab: Tab<PaneViewerData>) => boolean | Promise<boolean>;
	onInteractionStateChange?: (state: WorkspaceInteractionState) => void;
	toolbar: ReactNode;
	activity: ReactNode;
	isFullScreen: boolean;
	onToggleFullScreen: () => void;
	isFocused: boolean;
	onOpenDiff: () => void;
	onOpenPullRequest: OpenPullRequestPane;
}

export function RightPaneArea({
	store,
	registry,
	paneActions,
	contextMenuActions,
	onBeforeCloseTab,
	onInteractionStateChange,
	toolbar,
	activity,
	isFullScreen,
	onToggleFullScreen,
	isFocused,
	onOpenDiff,
	onOpenPullRequest,
}: RightPaneAreaProps) {
	const { t } = useLingui();
	const { workspace } = useWorkspace();
	const tabs = useStore(store, (state) => state.tabs);
	const activeTabId = useStore(store, (state) => state.activeTabId);
	const sidebarPane = findSidebarPane(
		tabs.find((tab) => tab.id === activeTabId),
	);
	const activeView = sidebarPane
		? ((sidebarPane.data as DiffPaneData).sidebarTab ?? "changes")
		: "tools";
	// Keeps the New Tab's lists cached and fresh while the workspace is open.
	const { pullRequests } = useNewTabLists(workspace.id);
	useEffect(() => {
		if (!isFullScreen) return;
		const active = store.getState().getActivePane();
		if (active) store.getState().focusPane(active.pane.id);
	}, [isFullScreen, store]);
	// The slide's outer box is the one that shrinks to nothing when the pane
	// closes; the pane inside keeps its width and only turns invisible.
	const [paneBox, setPaneBox] = useState<HTMLElement | null>(null);
	const measurePaneBox = useCallback((node: HTMLDivElement | null) => {
		setPaneBox(node?.closest<HTMLElement>("[data-sidebar-slide]") ?? null);
	}, []);
	const titleBarSideSlot = useTitleBarSideSlot(paneBox);
	const isWankerShell = useWankerShell();

	const toolTabs = tabs.filter((tab) => !findSidebarPane(tab));
	const selectTool = (tab: Tab<PaneViewerData>) => {
		store.getState().setActiveTab(tab.id);
		if (isPreviewTab(tab))
			for (const pane of Object.values(tab.panes))
				store.getState().setPanePinned({ paneId: pane.id, pinned: true });
	};
	const addTool = () => store.getState().addTab({ panes: [NEW_TAB_PANE] });

	const navigationPlacement = titleBarTabBarProps(titleBarSideSlot, {
		paneArea: "right",
	});
	const navigation = (
		<RightPaneNavigation
			className={navigationPlacement.tabBarClassName}
			workspaceId={workspace.id}
			tabs={tabs}
			toolTabs={toolTabs}
			activeTabId={activeTabId}
			registry={registry}
			leading={isFullScreen ? <WindowChrome /> : undefined}
			onSelectTool={selectTool}
			onAddTool={addTool}
			activity={activity}
			onOpenDiff={onOpenDiff}
			isFullScreen={isFullScreen}
			onToggleFullScreen={onToggleFullScreen}
		/>
	);
	const placeNavigation = navigationPlacement.renderTabBar;

	return (
		<div className="contents" data-pane-area="right" ref={measurePaneBox}>
			{pullRequests.map((pr) => (
				<PullRequestCountsPrefetch key={pr.url} pullRequest={pr.ref} />
			))}
			<WorkspaceReviewHeader
				workspaceId={workspace.id}
				onOpenReview={() => openChangesSidebarInStore(store, "review")}
				onOpenPullRequest={onOpenPullRequest}
				toolbar={toolbar}
			/>
			<Tabs
				value={activeView}
				onValueChange={(value) => {
					if (value === "tools") {
						if (toolTabs[0]) selectTool(toolTabs[0]);
						else addTool();
						return;
					}
					if (value !== "files" && value !== "changes" && value !== "review")
						return;
					const targetTab =
						tabs.find(
							(tab) => tab.id === activeTabId && findSidebarPane(tab),
						) ?? tabs.find((tab) => findSidebarPane(tab));
					const targetPane = findSidebarPane(targetTab);
					if (targetTab && targetPane) {
						store.getState().setPaneData({
							paneId: targetPane.id,
							data: { ...targetPane.data, sidebarTab: value },
						});
						store.getState().setActiveTab(targetTab.id);
					} else openChangesSidebarInStore(store, value);
				}}
				className="h-full min-h-0 min-w-0 flex-1 gap-0"
			>
				{placeNavigation ? placeNavigation(navigation) : navigation}
				<TabsContent
					value={activeView}
					{...(activeView === "tools"
						? {
								role: "region",
								"aria-labelledby": undefined,
								"aria-label": t({ message: "Tools" }),
							}
						: {})}
					forceMount
					className="min-h-0 overflow-hidden"
				>
					<Workspace<PaneViewerData>
						allowSplits={false}
						renderTabBar={(tabBar) => (sidebarPane ? null : tabBar)}
						appearance={isWankerShell ? "cards" : "default"}
						isFocused={isFocused}
						keepAliveTabs={RIGHT_PANE_KEPT_TABS}
						registry={registry}
						paneActions={paneActions}
						contextMenuActions={contextMenuActions}
						onPaneError={reportRendererError}
						renderTabIcon={renderBrowserTabIcon}
						renameTabs={false}
						isPreviewTab={isPreviewTab}
						onTabClick={(tab) => {
							if (!isPreviewTab(tab)) return;
							for (const pane of Object.values(tab.panes)) {
								store
									.getState()
									.setPanePinned({ paneId: pane.id, pinned: true });
							}
						}}
						renderTabAccessory={(tab) => (
							<V2NotificationStatusIndicator
								sources={getV2NotificationSourcesForTab(tab)}
							/>
						)}
						onAddTab={() => store.getState().addTab({ panes: [NEW_TAB_PANE] })}
						onBeforeCloseTab={onBeforeCloseTab}
						onInteractionStateChange={onInteractionStateChange}
						store={store}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}

import { useLingui } from "@lingui/react/macro";
