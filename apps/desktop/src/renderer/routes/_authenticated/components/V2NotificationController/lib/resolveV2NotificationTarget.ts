import type { WorkspaceState } from "@superset/panes";
import type { AgentLifecyclePayload } from "@superset/workspace-client";
import type {
	PaneViewerData,
	TerminalPaneData,
} from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";

export interface V2NotificationTarget {
	workspaceId: string;
	tabId?: string;
	paneId?: string;
	terminalId: string;
}

type PaneLayout = WorkspaceState<PaneViewerData> | null | undefined;

export function resolveV2NotificationTarget({
	workspaceId,
	payload,
	paneLayout,
	rightPaneLayout,
	terminalPaneLayout,
}: {
	workspaceId: string;
	payload: AgentLifecyclePayload;
	paneLayout: PaneLayout;
	rightPaneLayout?: PaneLayout;
	terminalPaneLayout?: PaneLayout;
}): V2NotificationTarget {
	return (
		resolveTerminalTarget({
			workspaceId,
			terminalId: payload.terminalId,
			paneLayout,
			rightPaneLayout,
			terminalPaneLayout,
		}) ?? {
			workspaceId,
			terminalId: payload.terminalId,
		}
	);
}

export function resolveTerminalTarget({
	workspaceId,
	terminalId,
	paneLayout,
	rightPaneLayout,
	terminalPaneLayout,
}: {
	workspaceId: string;
	terminalId: string;
	paneLayout: PaneLayout;
	rightPaneLayout?: PaneLayout;
	terminalPaneLayout?: PaneLayout;
}): V2NotificationTarget | null {
	for (const layout of [paneLayout, rightPaneLayout, terminalPaneLayout]) {
		for (const tab of layout?.tabs ?? []) {
			for (const pane of Object.values(tab.panes)) {
				if (pane.kind !== "terminal") continue;
				const data = pane.data as Partial<TerminalPaneData>;
				if (data.terminalId !== terminalId) continue;
				return {
					workspaceId,
					tabId: tab.id,
					paneId: pane.id,
					terminalId,
				};
			}
		}
	}

	return null;
}

export function isV2NotificationTargetVisible({
	currentWorkspaceId,
	paneLayout,
	rightPaneLayout,
	terminalPaneLayout,
	terminalDockVisible = true,
	target,
}: {
	currentWorkspaceId: string | null;
	paneLayout: PaneLayout;
	rightPaneLayout?: PaneLayout;
	terminalPaneLayout?: PaneLayout;
	terminalDockVisible?: boolean;
	target: V2NotificationTarget;
}): boolean {
	if (!currentWorkspaceId || currentWorkspaceId !== target.workspaceId) {
		return false;
	}
	if (!target.tabId || !target.paneId) return false;

	return [
		paneLayout,
		rightPaneLayout,
		terminalDockVisible ? terminalPaneLayout : null,
	].some((layout) => {
		const tab = layout?.tabs.find((candidate) => candidate.id === target.tabId);
		return (
			tab !== undefined &&
			tab.activePaneId === target.paneId &&
			layout?.activeTabId === tab.id
		);
	});
}
