import { expect, mock, test } from "bun:test";
import { createWorkspaceStore } from "../../../../../core/store";
import { separatePaneTabs } from "./separatePaneTabs";

test("separates saved splits without closing panes or changing the focused session", () => {
	const store = createWorkspaceStore<{ terminalId: string }>();
	const close = mock(() => {});
	store.getState().subscribePaneClose(close);
	store.getState().addTab({
		id: "chat",
		titleOverride: "Work",
		panes: [
			{ id: "agent", kind: "chat", data: { terminalId: "agent-session" } },
			{ id: "shell", kind: "terminal", data: { terminalId: "shell-session" } },
			{ id: "other", kind: "chat", data: { terminalId: "other-session" } },
		],
	});
	store.getState().setActivePane({ tabId: "chat", paneId: "agent" });
	const panes = store
		.getState()
		.tabs.flatMap((tab) => Object.values(tab.panes));
	separatePaneTabs(store);
	const next = store.getState();
	expect(next.tabs).toHaveLength(3);
	expect(next.tabs.every((tab) => tab.layout.type === "pane")).toBe(true);
	expect(next.tabs[0]?.titleOverride).toBe("Work");
	expect(next.getActivePane()?.pane.id).toBe("agent");
	for (const pane of panes)
		expect(next.tabs.flatMap((tab) => Object.values(tab.panes))).toContain(
			pane,
		);
	expect(close).not.toHaveBeenCalled();
	const state = store.getState();
	separatePaneTabs(store);
	expect(store.getState()).toBe(state);
});

test("normalizing a background split does not select it", () => {
	const store = createWorkspaceStore<null>();
	store.getState().addTab({
		id: "background",
		panes: [
			{ id: "one", kind: "file", data: null },
			{ id: "two", kind: "file", data: null },
		],
	});
	store.getState().addTab({
		id: "current",
		panes: [{ id: "active", kind: "chat", data: null }],
	});
	separatePaneTabs(store);
	expect(store.getState().activeTabId).toBe("current");
	expect(store.getState().getActivePane()?.pane.id).toBe("active");
});
