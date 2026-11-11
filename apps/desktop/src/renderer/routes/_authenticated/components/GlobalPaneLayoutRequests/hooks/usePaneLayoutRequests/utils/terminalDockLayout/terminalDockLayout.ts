import type { WorkspaceState } from "@superset/panes";
import type { PaneViewerData } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";

type Layout = WorkspaceState<PaneViewerData>;

export function joinSidebarLayouts(
	sidebar: Layout,
	dock: Layout,
	dockFocused = false,
): Layout {
	return {
		...sidebar,
		tabs: [...sidebar.tabs, ...dock.tabs],
		activeTabId: dockFocused
			? dock.activeTabId
			: (sidebar.activeTabId ?? dock.activeTabId),
	};
}

export function splitSidebarLayout(
	layout: Layout,
	previous: { sidebar: Layout; dock: Layout },
): { sidebar: Layout; dock: Layout } {
	const dockTabs = layout.tabs.filter((tab) =>
		Object.values(tab.panes).every((pane) => pane.kind === "terminal"),
	);
	const dockIds = new Set(dockTabs.map((tab) => tab.id));
	const sidebarTabs = layout.tabs.filter((tab) => !dockIds.has(tab.id));
	const select = (tabs: Layout["tabs"], fallback: Layout): Layout => ({
		version: 1,
		tabs,
		activeTabId: tabs.some((tab) => tab.id === layout.activeTabId)
			? layout.activeTabId
			: tabs.some((tab) => tab.id === fallback.activeTabId)
				? fallback.activeTabId
				: (tabs[0]?.id ?? null),
	});
	return {
		sidebar: select(sidebarTabs, previous.sidebar),
		dock: select(dockTabs, previous.dock),
	};
}
