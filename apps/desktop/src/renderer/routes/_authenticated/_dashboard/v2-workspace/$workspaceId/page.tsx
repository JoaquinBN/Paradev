import { useLingui } from "@lingui/react/macro";
import { Workspace } from "@superset/panes";
import { cn } from "@superset/ui/utils";
import { workspaceTrpc } from "@superset/workspace-client";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useQuickOpenStore } from "renderer/commandPalette/ui/QuickOpen/quickOpenStore";
import { useParadevShell } from "renderer/hooks/useParadevShell";
import { useV2UserPreferences } from "renderer/hooks/useV2UserPreferences";
import { useHotkey } from "renderer/hotkeys";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { reportRendererError } from "renderer/lib/report-renderer-error";
import { RightSidebarToggle } from "renderer/routes/_authenticated/_dashboard/components/RightSidebarToggle";
import { StateScreenShell } from "renderer/routes/_authenticated/_dashboard/components/StateScreenShell";
import { WindowChrome } from "renderer/routes/_authenticated/_dashboard/components/WindowChrome";
import { WindowControlsInset } from "renderer/routes/_authenticated/_dashboard/components/WindowControlsInset";
import {
	titleBarTabBarProps,
	useTitleBarMainSlot,
} from "renderer/routes/_authenticated/_dashboard/providers/TitleBarSlotsProvider";
import {
	parseSubagentSearch,
	readSubagentSearch,
} from "renderer/routes/_authenticated/_dashboard/utils/workspace-navigation";
import { CommandPalette } from "renderer/screens/main/components/CommandPalette";
import { useRightPaneAreaEnabled } from "renderer/stores/right-pane-area";
import { getV2NotificationSourcesForTab } from "renderer/stores/v2-notifications";
import { useStore } from "zustand";
import { usePendingCloudChat } from "../hooks/usePendingCloudChat";
import { useWorkspace } from "../providers/WorkspaceProvider";
import { ChangesControl } from "./components/ChangesControl";
import { CloudWorkspaceTabBarControls } from "./components/CloudWorkspaceTabBarControls";
import { HostConnectionPill } from "./components/HostConnectionPill";
import { RightPaneArea } from "./components/RightPaneArea";
import { MIN_RIGHT_PANE_AREA_WIDTH } from "./components/RightPaneArea/constants";
import { V2NotificationStatusIndicator } from "./components/V2NotificationStatusIndicator";
import { V2WorkspaceOpenInButton } from "./components/V2WorkspaceOpenInButton";
import { V2WorkspaceRunButton } from "./components/V2WorkspaceRunButton";
import { WorkspaceActivityMenu } from "./components/WorkspaceActivityMenu";
import { WorkspaceAgentEffects } from "./components/WorkspaceAgentEffects";
import { WorkspaceEmptyState } from "./components/WorkspaceEmptyState";
import { WorkspaceFocusHeader } from "./components/WorkspaceFocusHeader";
import { WorkspaceMissingWorktreeState } from "./components/WorkspaceMissingWorktreeState";
import { WorkspaceMoveBanner } from "./components/WorkspaceMoveBanner";
import { WorkspaceScriptsMenu } from "./components/WorkspaceScriptsMenu";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar";
import { WorkspaceSidePanel } from "./components/WorkspaceSidePanel";
import {
	type PaneArea,
	WorkspaceSplitLayout,
} from "./components/WorkspaceSplitLayout";
import { WorkspaceTerminalEffects } from "./components/WorkspaceTerminalEffects";
import { WorkspaceToolbar } from "./components/WorkspaceToolbar";
import { useAgentSessionLauncher } from "./hooks/useAgentSessionLauncher";
import { useAutoAdoptBackgroundSessions } from "./hooks/useAutoAdoptBackgroundSessions";
import { useCloseRightPaneAreaWhenEmpty } from "./hooks/useCloseRightPaneAreaWhenEmpty";
import { useConsumeAutomationRunLink } from "./hooks/useConsumeAutomationRunLink";
import { useConsumeOpenUrlRequest } from "./hooks/useConsumeOpenUrlRequest";
import { useConsumeSubagentLink } from "./hooks/useConsumeSubagentLink";
import { useCreatePendingMigratedTerminals } from "./hooks/useCreatePendingMigratedTerminals";
import { useDefaultContextMenuActions } from "./hooks/useDefaultContextMenuActions";
import { useDefaultPaneActions } from "./hooks/useDefaultPaneActions";
import { useDiffPaneTarget } from "./hooks/useDiffPaneTarget";
import { useOpenNewTabWhenRightPaneOpensEmpty } from "./hooks/useOpenNewTabWhenRightPaneOpensEmpty";
import { usePaneAreaMoveActions } from "./hooks/usePaneAreaMoveActions";
import { usePaneRegistry } from "./hooks/usePaneRegistry";
import { renderBrowserTabIcon } from "./hooks/usePaneRegistry/components/BrowserPane";
import { browserRuntimeRegistry } from "./hooks/usePaneRegistry/components/BrowserPane/browserRuntimeRegistry";
import { usePullRequestPaneIntentOpener } from "./hooks/usePullRequestPaneIntentOpener";
import { useRestoreExpandedPaneArea } from "./hooks/useRestoreExpandedPaneArea";
import { useRightSidebarHotkeys } from "./hooks/useRightSidebarHotkeys";
import { useRunPendingChatHandoff } from "./hooks/useRunPendingChatHandoff";
import { useRunWorkspaceCreationPresets } from "./hooks/useRunWorkspaceCreationPresets";
import { useShellInteractionPassthrough } from "./hooks/useShellInteractionPassthrough";
import { useSyncChatSessionTabs } from "./hooks/useSyncChatSessionTabs";
import { useTabCloseGuard } from "./hooks/useTabCloseGuard";
import { useV2PresetExecution } from "./hooks/useV2PresetExecution";
import { useV2TerminalLauncher } from "./hooks/useV2TerminalLauncher";
import { useV2WorkspacePaneLayout } from "./hooks/useV2WorkspacePaneLayout";
import { useV2WorkspaceRun } from "./hooks/useV2WorkspaceRun";
import { useWorkspaceFileNavigation } from "./hooks/useWorkspaceFileNavigation";
import { useWorkspaceHotkeys } from "./hooks/useWorkspaceHotkeys";
import { useWorkspacePaneOpeners } from "./hooks/useWorkspacePaneOpeners";
import { useWorkspaceRightPane } from "./hooks/useWorkspaceRightPane";
import { RightPaneLinkTargetProvider } from "./providers/RightPaneLinkTargetProvider";
import { WorkspaceGitStatusProvider } from "./providers/WorkspaceGitStatusProvider";
import { FileDocumentStoreProvider } from "./state/fileDocumentStore";
import type {
	ConsumeSearch,
	PaneTarget,
	PaneViewerData,
	SubagentPaneData,
} from "./types";
import { isWorktreeMissing } from "./utils/isWorktreeMissing";
import {
	closeVisibleChangesPane,
	findVisibleChangesPane,
} from "./utils/openChangesPaneInStore";
import { openChangesSidebarInStore } from "./utils/openChangesSidebarInStore";
import { openPullRequestPaneInStore } from "./utils/openPullRequestPaneInStore";
import { openSubagentPaneInStore } from "./utils/openSubagentPaneInStore";
import { openTerminalDock } from "./utils/openTerminalDock";
import type { V2WorkspaceUrlOpenTarget } from "./utils/openUrlInV2Workspace";

const relayoutBrowserPanes = () => browserRuntimeRegistry.relayout();

const defaultRightPaneAreaWidth = (containerWidth: number) =>
	Math.round(containerWidth * 0.4);
const defaultRightSidebarWidth = () => 340;

interface WorkspaceSearch {
	sessionId?: string;
	terminalId?: string;
	focusRequestId?: string;
	/** Deep link from the sidebar's agents chip into a subagent transcript. */
	subagentTerminalId?: string;
	subagentId?: string;
	subagentAgentId?: string;
	subagentType?: string;
	openUrl?: string;
	openUrlTarget?: V2WorkspaceUrlOpenTarget;
	openUrlRequestId?: string;
}

function parseOpenUrlTarget(
	value: unknown,
): V2WorkspaceUrlOpenTarget | undefined {
	if (value === "current-tab" || value === "new-tab") return value;
	return undefined;
}

function parseNonEmptyString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const Route = createFileRoute(
	"/_authenticated/_dashboard/v2-workspace/$workspaceId/",
)({
	component: V2WorkspacePage,
	validateSearch: (raw: Record<string, unknown>): WorkspaceSearch => ({
		sessionId: parseNonEmptyString(raw.sessionId),
		terminalId: parseNonEmptyString(raw.terminalId),
		focusRequestId: parseNonEmptyString(raw.focusRequestId),
		...readSubagentSearch(raw),
		openUrl: parseNonEmptyString(raw.openUrl),
		openUrlTarget: parseOpenUrlTarget(raw.openUrlTarget),
		openUrlRequestId: parseNonEmptyString(raw.openUrlRequestId),
	}),
});

function V2WorkspacePage() {
	const { workspace } = useWorkspace();
	const pendingCloudChat = usePendingCloudChat(workspace.id);
	const workspaceStatusQuery = workspaceTrpc.workspace.get.useQuery(
		{ id: workspace.id },
		{
			enabled: !pendingCloudChat,
			staleTime: 0,
			refetchOnWindowFocus: true,
		},
	);

	if (isWorktreeMissing(workspaceStatusQuery, !!pendingCloudChat)) {
		return (
			<StateScreenShell>
				<WorkspaceMissingWorktreeState
					workspaceId={workspace.id}
					workspaceName={workspace.name}
					branch={workspace.branch}
					worktreePath={workspaceStatusQuery.data?.worktreePath}
					onRefresh={() => {
						void workspaceStatusQuery.refetch();
					}}
					isRefreshing={workspaceStatusQuery.isFetching}
				/>
			</StateScreenShell>
		);
	}

	return <V2WorkspaceContent />;
}

function V2WorkspaceContent() {
	const { t } = useLingui();
	const {
		sessionId,
		terminalId,
		focusRequestId,
		subagentTerminalId,
		subagentId,
		subagentAgentId,
		subagentType,
		openUrl,
		openUrlTarget,
		openUrlRequestId,
	} = Route.useSearch();
	const { workspace } = useWorkspace();
	const workspaceId = workspace.id;
	const navigate = Route.useNavigate();
	const titleBarMainSlot = useTitleBarMainSlot();
	const isParadevShell = useParadevShell();
	const consumeSearch = useCallback<ConsumeSearch>(
		(keys) => {
			void navigate({
				search: (prev) => ({
					...prev,
					...Object.fromEntries(keys.map((key) => [key, undefined])),
					focusRequestId: undefined,
				}),
				replace: true,
			});
		},
		[navigate],
	);

	const {
		preferences: v2UserPreferences,
		setRightSidebarWidth,
		setRightPaneAreaWidth,
		setShowPresetsBar,
	} = useV2UserPreferences();
	const showPresetsBar = v2UserPreferences.showPresetsBar;
	const { store, isLayoutReady } = useV2WorkspacePaneLayout();
	const isRightPaneAreaEnabled = useRightPaneAreaEnabled();
	const {
		isOpen: sidebarOpen,
		setOpen: setRightSidebarOpen,
		toggle: toggleRightSidebar,
		mode: rightPaneMode,
		toggleFullScreen: toggleRightPaneAreaFullScreen,
	} = useWorkspaceRightPane({
		workspaceId,
		isPaneAreaEnabled: isRightPaneAreaEnabled,
	});
	const { store: rightStore, isLayoutReady: isRightLayoutReady } =
		useV2WorkspacePaneLayout({ slot: "rightPaneLayout" });
	const { store: terminalStore, isLayoutReady: isTerminalLayoutReady } =
		useV2WorkspacePaneLayout({ slot: "terminalPaneLayout" });
	const [terminalDockOpen, setTerminalDockOpen] = useState(true);
	const revealTerminalDock = useCallback(() => {
		setTerminalDockOpen(true);
		setRightSidebarOpen(true);
	}, [setRightSidebarOpen]);
	useRestoreExpandedPaneArea({
		workspaceId,
		centerStore: store,
		rightStore,
		isReady: isLayoutReady && isRightLayoutReady && isTerminalLayoutReady,
	});
	const openRightSidebar = useCallback(
		() => setRightSidebarOpen(true),
		[setRightSidebarOpen],
	);
	const closeRightSidebar = useCallback(
		() => setRightSidebarOpen(false),
		[setRightSidebarOpen],
	);
	const openRightSidebarTab = useCallback(
		(sidebarTab: "files" | "changes") => {
			setRightSidebarOpen(true);
			openChangesSidebarInStore(rightStore, sidebarTab);
		},
		[rightStore, setRightSidebarOpen],
	);
	const openRightFilesTab = useCallback(
		() => openRightSidebarTab("files"),
		[openRightSidebarTab],
	);
	const rightTarget = useMemo<PaneTarget>(
		() => ({ store: rightStore, reveal: openRightSidebar }),
		[rightStore, openRightSidebar],
	);
	const terminalTarget = useMemo<PaneTarget>(
		() => ({ store: terminalStore, reveal: revealTerminalDock }),
		[terminalStore, revealTerminalDock],
	);
	const rightPaneLinkTarget = isRightPaneAreaEnabled ? rightTarget : null;
	const viewerTarget = useMemo<PaneTarget>(
		() => rightPaneLinkTarget ?? { store, reveal: () => {} },
		[rightPaneLinkTarget, store],
	);
	const centerViewerTarget = useMemo<PaneTarget>(
		() => ({
			store,
			reveal: () => {
				if (rightPaneMode === "expanded") toggleRightPaneAreaFullScreen();
			},
		}),
		[store, rightPaneMode, toggleRightPaneAreaFullScreen],
	);
	const openSubagentPane = useCallback(
		(data: SubagentPaneData) => {
			viewerTarget.reveal();
			openSubagentPaneInStore(viewerTarget.store, data);
		},
		[viewerTarget],
	);
	const linkedPaneStores = useMemo(
		() => [rightStore, terminalStore],
		[rightStore, terminalStore],
	);
	const fileDocumentStores = useMemo(
		() => [store, rightStore, terminalStore],
		[store, rightStore, terminalStore],
	);
	const hasDockTerminals = useStore(
		terminalStore,
		(state) => state.tabs.length > 0,
	);
	useCloseRightPaneAreaWhenEmpty({
		store: rightStore,
		enabled: isRightPaneAreaEnabled && isRightLayoutReady && !hasDockTerminals,
		close: closeRightSidebar,
	});
	useOpenNewTabWhenRightPaneOpensEmpty({
		store: rightStore,
		isOpen: sidebarOpen,
		enabled: isRightPaneAreaEnabled && isRightLayoutReady,
	});
	const launcher = useV2TerminalLauncher();
	const {
		createNewAgentSession,
		openAgentChat,
		openNewChat,
		focusAgentTerminal,
	} = useAgentSessionLauncher({
		workspaceId,
		store,
		linkedStores: linkedPaneStores,
	});
	const addChatTab = useCallback(() => {
		centerViewerTarget.reveal();
		void openNewChat();
	}, [openNewChat, centerViewerTarget]);
	const {
		matchedPresets,
		newTabPresets,
		executePreset,
		resolvePresetCommands,
	} = useV2PresetExecution({
		store: isRightPaneAreaEnabled ? terminalStore : store,
		launcher,
		openAgentChat,
	});
	const workspaceRun = useV2WorkspaceRun({
		store: isRightPaneAreaEnabled ? terminalStore : store,
		launcher,
		matchedPresets,
		resolvePresetCommands,
	});
	useConsumeAutomationRunLink({
		store,
		linkedStores: linkedPaneStores,
		isLayoutReady: isLayoutReady && isRightLayoutReady && isTerminalLayoutReady,
		workspaceId,
		sessionId,
		terminalId,
		focusRequestId,
		consumeSearch,
	});
	const subagentLink = useMemo(
		() =>
			parseSubagentSearch({
				subagentTerminalId,
				subagentId,
				subagentAgentId,
				subagentType,
			}),
		[subagentTerminalId, subagentId, subagentAgentId, subagentType],
	);
	useConsumeSubagentLink({
		openSubagentPane,
		isLayoutReady,
		link: subagentLink,
		focusRequestId,
		consumeSearch,
	});
	useCreatePendingMigratedTerminals({ workspaceId, isLayoutReady });
	useRunWorkspaceCreationPresets({
		workspaceId,
		isLayoutReady,
		executePreset,
		resolvePresetCommands,
	});
	useAutoAdoptBackgroundSessions({
		store,
		linkedStores: linkedPaneStores,
		workspaceId,
		isLayoutReady: isLayoutReady && isRightLayoutReady && isTerminalLayoutReady,
	});
	useSyncChatSessionTabs({
		store,
		linkedStores: linkedPaneStores,
		workspaceId,
		isLayoutReady: isLayoutReady && isRightLayoutReady && isTerminalLayoutReady,
	});
	useConsumeOpenUrlRequest({
		viewer: viewerTarget,
		url: openUrl,
		target: openUrlTarget,
		requestId: openUrlRequestId,
		consumeSearch,
	});

	const {
		openFilePaneFromTreeClick,
		openPinnedFilePane,
		revealPath,
		selectedFilePath,
		pendingReveal,
		recentFiles,
		openFilePaths,
	} = useWorkspaceFileNavigation({
		viewer: centerViewerTarget,
		placement: "tab",
		setRightSidebarOpen,
		onReveal: isRightPaneAreaEnabled ? openRightFilesTab : undefined,
	});

	const {
		openDiffPane,
		addTerminalTab,
		addBrowserTab,
		openChangesPane,
		toggleChangesPane,
		openCommentPane,
		openPagePane,
		openPullRequestPane,
	} = useWorkspacePaneOpeners({
		store,
		viewer: viewerTarget,
		diffViewer: centerViewerTarget,
		diffPlacement: "tab",
		launcher,
		newTabPresets,
		executePreset,
		setRightSidebarOpen,
		terminalTarget: isRightPaneAreaEnabled ? terminalTarget : undefined,
	});
	const addDockTerminal = useCallback(() => {
		openTerminalDock(terminalStore, launcher.mint, true);
		revealTerminalDock();
	}, [terminalStore, launcher.mint, revealTerminalDock]);
	const focusTerminalDock = useCallback(() => {
		openTerminalDock(terminalStore, launcher.mint);
		revealTerminalDock();
	}, [terminalStore, launcher.mint, revealTerminalDock]);
	const quickOpenOpen = useQuickOpenStore(
		(s) => s.open && s.target?.workspaceId === workspaceId,
	);
	const closeQuickOpen = useQuickOpenStore((s) => s.close);
	const openQuickOpenFor = useQuickOpenStore((s) => s.openFor);
	const handleQuickOpen = useCallback(
		() => openQuickOpenFor({ workspaceId }),
		[openQuickOpenFor, workspaceId],
	);
	const handleQuickOpenChange = useCallback(
		(next: boolean) => {
			if (!next) closeQuickOpen();
		},
		[closeQuickOpen],
	);
	// Picking a file from Quick Open should surface the sidebar/Files tab so
	// the reveal (expand + highlight + scroll) is actually visible.
	const handleQuickOpenSelectFile = useCallback(
		(filePath: string, openInNewTab?: boolean) => {
			if (!isRightPaneAreaEnabled) {
				setRightSidebarOpen(true);
				openFilePaneFromTreeClick(filePath, openInNewTab);
				return;
			}
			if (openInNewTab) openFilePaneFromTreeClick(filePath, true);
			else openPinnedFilePane(filePath);
		},
		[
			openFilePaneFromTreeClick,
			openPinnedFilePane,
			setRightSidebarOpen,
			isRightPaneAreaEnabled,
		],
	);
	const paneRegistry = usePaneRegistry({
		onOpenDiff: openDiffPane,
		onOpenFile: openFilePaneFromTreeClick,
		onRevealPath: revealPath,
		launcher,
		store,
		linkedStores: linkedPaneStores,
		onOpenSubagent: openSubagentPane,
		onSearch: handleQuickOpen,
		pendingFileReveal: pendingReveal,
		rightStore: isRightPaneAreaEnabled ? rightStore : undefined,
	});
	const defaultContextMenuActions = useDefaultContextMenuActions();
	const diffPaneTarget = useDiffPaneTarget(store);
	const isChangesPaneOpen = useStore(
		store,
		(state) => findVisibleChangesPane(state) != null,
	);
	const isRightChangesTabOpen = useStore(
		rightStore,
		(state) => findVisibleChangesPane(state) != null,
	);
	const openRightChangesTab = useCallback(
		() => openRightSidebarTab("changes"),
		[openRightSidebarTab],
	);
	const toggleRightChangesTab = useCallback(() => {
		if (sidebarOpen && closeVisibleChangesPane(rightStore)) return;
		openRightChangesTab();
	}, [rightStore, sidebarOpen, openRightChangesTab]);
	const openChanges = isRightPaneAreaEnabled
		? openRightChangesTab
		: openChangesPane;
	const toggleChanges = isRightPaneAreaEnabled
		? toggleRightChangesTab
		: toggleChangesPane;
	const isChangesOpen = isRightPaneAreaEnabled
		? sidebarOpen && isRightChangesTabOpen
		: isChangesPaneOpen;

	usePullRequestPaneIntentOpener({
		workspaceId,
		isLayoutReady,
		openPullRequestPane,
	});
	useRunPendingChatHandoff({
		workspaceId,
		isLayoutReady,
		createNewAgentSession,
	});

	const defaultPaneActions = useDefaultPaneActions();
	const onBeforeCloseTab = useTabCloseGuard(store);
	const onBeforeCloseRightTab = useTabCloseGuard(rightStore);
	const onBeforeCloseTerminalTab = useTabCloseGuard(terminalStore);
	const activeAreaRef = useRef<PaneArea>("center");
	const [focusedArea, setFocusedArea] = useState<PaneArea>("center");
	const isRightAreaFocused =
		isRightPaneAreaEnabled && sidebarOpen && focusedArea === "right";
	const getCloseTarget = useCallback(
		() =>
			isRightPaneAreaEnabled &&
			sidebarOpen &&
			activeAreaRef.current === "terminal"
				? { store: terminalStore, onBeforeCloseTab: onBeforeCloseTerminalTab }
				: isRightPaneAreaEnabled &&
						sidebarOpen &&
						activeAreaRef.current === "right"
					? { store: rightStore, onBeforeCloseTab: onBeforeCloseRightTab }
					: { store, onBeforeCloseTab },
		[
			isRightPaneAreaEnabled,
			sidebarOpen,
			rightStore,
			onBeforeCloseRightTab,
			terminalStore,
			onBeforeCloseTerminalTab,
			store,
			onBeforeCloseTab,
		],
	);
	const centerContextMenuActions = usePaneAreaMoveActions({
		defaults: defaultContextMenuActions,
		enabled: isRightPaneAreaEnabled,
		source: store,
		target: rightStore,
		onMoved: openRightSidebar,
	});

	const { onSidebarResizeDragging, onWorkspaceInteractionStateChange } =
		useShellInteractionPassthrough({ sidebarOpen });

	useWorkspaceHotkeys({
		viewer: viewerTarget,
		matchedPresets,
		executePreset,
		addTerminalTab,
		openChangesPane: openChanges,
		paneRegistry,
		launcher,
		getCloseTarget,
	});
	useRightSidebarHotkeys({
		centerStore: store,
		rightStore,
		enabled: isRightPaneAreaEnabled,
		isOpen: sidebarOpen,
		isExpanded: rightPaneMode === "expanded",
		open: openRightSidebar,
		activeAreaRef,
	});
	useHotkey("QUICK_OPEN", handleQuickOpen);
	useHotkey("NEW_CHAT", addChatTab);
	useHotkey("RUN_WORKSPACE_COMMAND", () => {
		void workspaceRun.toggleWorkspaceRun();
	});

	const { data: platform } = electronTrpc.window.getPlatform.useQuery();
	// Default to Mac while loading so window controls don't flash in.
	const isMac = platform === undefined || platform === "darwin";

	const workspaceRunButton = (
		<V2WorkspaceRunButton
			projectId={workspace.projectId}
			definition={workspaceRun.definition}
			isRunning={workspaceRun.isRunning}
			isPending={workspaceRun.isPending}
			canForceStop={workspaceRun.canForceStop}
			onToggle={workspaceRun.toggleWorkspaceRun}
			onForceStop={workspaceRun.forceStopWorkspaceRun}
		/>
	);

	const renderWorkspaceToolbar = (isRightPaneOpen: boolean) => (
		<WorkspaceToolbar
			run={workspaceRun}
			isRightPaneOpen={isRightPaneOpen}
			onToggleRightPane={toggleRightSidebar}
			showWindowControls={!isMac}
		/>
	);

	const activityMenu = (
		<WorkspaceActivityMenu
			compact
			workspaceId={workspaceId}
			store={store}
			linkedStores={linkedPaneStores}
			isLayoutReady={
				isLayoutReady && isRightLayoutReady && isTerminalLayoutReady
			}
			onOpenPage={openPagePane}
			onCreateNewAgentSession={createNewAgentSession}
			onFocusAgentTerminal={focusAgentTerminal}
			onOpenPullRequest={openPullRequestPane}
			changes={
				isRightPaneAreaEnabled
					? { isOpen: isChangesOpen, onToggle: toggleChanges }
					: undefined
			}
		/>
	);

	const rightPaneArea = (
		<RightPaneArea
			key={workspaceId}
			store={rightStore}
			registry={paneRegistry}
			paneActions={defaultPaneActions}
			contextMenuActions={defaultContextMenuActions}
			onBeforeCloseTab={onBeforeCloseRightTab}
			onInteractionStateChange={onWorkspaceInteractionStateChange}
			activity={activityMenu}
			toolbar={renderWorkspaceToolbar(true)}
			isFullScreen={rightPaneMode === "expanded"}
			onToggleFullScreen={toggleRightPaneAreaFullScreen}
			isFocused={isRightAreaFocused}
			onOpenDiff={() => openDiffPane("")}
			onOpenPullRequest={(ref, placement) => {
				centerViewerTarget.reveal();
				openPullRequestPaneInStore(store, ref, placement);
			}}
		/>
	);

	return (
		<FileDocumentStoreProvider stores={fileDocumentStores}>
			<WorkspaceAgentEffects store={store} rightStore={rightStore} />
			<WorkspaceTerminalEffects
				center={store}
				right={rightStore}
				dock={terminalStore}
				enabled={isRightPaneAreaEnabled}
				visible={sidebarOpen && terminalDockOpen}
				ready={isLayoutReady && isRightLayoutReady && isTerminalLayoutReady}
				onDock={revealTerminalDock}
			/>
			<RightPaneLinkTargetProvider value={rightPaneLinkTarget}>
				<WorkspaceGitStatusProvider workspaceId={workspaceId}>
					<div
						data-design-surface="workspace-shell"
						className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
					>
						<WorkspaceSplitLayout
							mode={rightPaneMode}
							activeAreaRef={activeAreaRef}
							onActiveAreaChange={setFocusedArea}
							{...(isRightPaneAreaEnabled
								? {
										width: v2UserPreferences.rightPaneAreaWidth,
										minWidth: MIN_RIGHT_PANE_AREA_WIDTH,
										maxWidth: Number.POSITIVE_INFINITY,
										defaultWidth: defaultRightPaneAreaWidth,
										onWidthChange: setRightPaneAreaWidth,
									}
								: {
										width: v2UserPreferences.rightSidebarWidth,
										minWidth: 240,
										maxWidth: 640,
										defaultWidth: defaultRightSidebarWidth,
										onWidthChange: setRightSidebarWidth,
									})}
							onResizingChange={onSidebarResizeDragging}
							onLayoutFrame={relayoutBrowserPanes}
							keepMounted={isRightPaneAreaEnabled}
							side={
								isRightPaneAreaEnabled ? (
									<>
										<WorkspaceSidePanel
											terminal={{
												store: terminalStore,
												registry: paneRegistry,
												paneActions: defaultPaneActions,
												contextMenuActions: defaultContextMenuActions,
												onBeforeCloseTab: onBeforeCloseTerminalTab,
												isFocused: sidebarOpen && focusedArea === "terminal",
											}}
											open={terminalDockOpen}
											onOpenChange={setTerminalDockOpen}
											onNewTerminal={addDockTerminal}
											onResizingChange={onSidebarResizeDragging}
										>
											{rightPaneArea}
										</WorkspaceSidePanel>
										{rightPaneMode === "expanded" && <HostConnectionPill />}
									</>
								) : (
									<div className="flex h-full min-h-0 flex-col">
										<div className="flex justify-end border-b p-2">
											{activityMenu}
										</div>
										<WorkspaceSidebar
											workspaceId={workspaceId}
											runButton={workspaceRunButton}
											onSelectFile={openFilePaneFromTreeClick}
											onSelectDiffFile={openDiffPane}
											onOpenComment={openCommentPane}
											onOpenPullRequest={openPullRequestPane}
											onSearch={handleQuickOpen}
											selectedFilePath={selectedFilePath}
											selectedDiffTarget={diffPaneTarget}
											pendingReveal={pendingReveal}
										/>
									</div>
								)
							}
						>
							<div
								className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
								data-workspace-id={workspaceId}
								data-pane-area="center"
							>
								<WorkspaceFocusHeader
									onOpenChat={addChatTab}
									onOpenTerminal={
										isRightPaneAreaEnabled ? focusTerminalDock : addTerminalTab
									}
									onOpenChanges={openChanges}
									onOpenFiles={
										isRightPaneAreaEnabled ? openRightFilesTab : handleQuickOpen
									}
									scripts={
										<WorkspaceScriptsMenu
											matchedPresets={matchedPresets}
											executePreset={executePreset}
											showPresetsBar={showPresetsBar}
											onToggleShowPresetsBar={setShowPresetsBar}
										/>
									}
								/>
								{rightPaneMode !== "expanded" && <HostConnectionPill />}
								<WorkspaceMoveBanner workspaceId={workspaceId} />
								{
									<Workspace<PaneViewerData>
										key={workspaceId}
										{...titleBarTabBarProps(titleBarMainSlot, {
											paneArea: "center",
											inert: rightPaneMode === "expanded",
										})}
										appearance={isParadevShell ? "cards" : "default"}
										isFocused={focusedArea === "center" || !sidebarOpen}
										registry={paneRegistry}
										paneActions={defaultPaneActions}
										contextMenuActions={centerContextMenuActions}
										onPaneError={reportRendererError}
										renderTabIcon={renderBrowserTabIcon}
										renderTabAccessory={(tab) => (
											<V2NotificationStatusIndicator
												sources={getV2NotificationSourcesForTab(tab)}
											/>
										)}
										onAddTab={addChatTab}
										addTabLabel={t({ message: "New Chat" })}
										allowSplits={false}
										renderTabBarLeading={() => <WindowChrome />}
										renderTabBarTrailing={() => (
											<div
												className={cn(
													"flex items-center gap-1",
													isRightPaneAreaEnabled && "pr-1",
												)}
											>
												<CloudWorkspaceTabBarControls
													workspaceId={workspaceId}
												/>
												{isRightPaneAreaEnabled ? (
													!sidebarOpen && renderWorkspaceToolbar(false)
												) : (
													<>
														{isLayoutReady && (
															<ChangesControl
																workspaceId={workspaceId}
																isChangesOpen={isChangesOpen}
																onToggleChanges={toggleChanges}
																onOpenPullRequest={openPullRequestPane}
															/>
														)}
														{/* Open-in must not depend on the right sidebar being open,
											    so it lives here rather than in the sidebar's top strip
											    (#7167). Without an @container ancestor its branch label
											    stays hidden, which keeps it compact for the tab bar. */}
														<V2WorkspaceOpenInButton
															workspaceId={workspaceId}
														/>
														<RightSidebarToggle
															isOpen={sidebarOpen}
															onToggle={toggleRightSidebar}
														/>
														{!isMac && !sidebarOpen && <WindowControlsInset />}
													</>
												)}
											</div>
										)}
										renderEmptyState={() => (
											<WorkspaceEmptyState
												onOpenBrowser={addBrowserTab}
												onOpenChanges={openChanges}
												onOpenChat={addChatTab}
												onOpenQuickOpen={handleQuickOpen}
												onOpenTerminal={addTerminalTab}
											/>
										)}
										onBeforeCloseTab={onBeforeCloseTab}
										onInteractionStateChange={onWorkspaceInteractionStateChange}
										store={store}
									/>
								}
							</div>
						</WorkspaceSplitLayout>
					</div>
				</WorkspaceGitStatusProvider>
			</RightPaneLinkTargetProvider>
			<CommandPalette
				workspaceId={workspaceId}
				open={quickOpenOpen}
				onOpenChange={handleQuickOpenChange}
				onSelectFile={handleQuickOpenSelectFile}
				variant="v2"
				recentlyViewedFiles={recentFiles}
				openFilePaths={openFilePaths}
			/>
		</FileDocumentStoreProvider>
	);
}
