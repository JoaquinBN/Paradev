import { describe, expect, test } from "bun:test";
import { createWorkspaceStore } from "@superset/panes";
import type { PaneViewerData } from "../../types";
import { dockTerminalPanes } from "./dockTerminalPanes";

const makeStore = () => createWorkspaceStore<PaneViewerData>();
const shell = (terminalId: string) => ({
	kind: "terminal",
	data: { terminalId, createOnAttach: true },
});

describe("terminal dock layout", () => {
	test("moves existing terminal tabs without closing sessions or changing their IDs and split layout", () => {
		const center = makeStore(),
			right = makeStore(),
			dock = makeStore();
		center.getState().addTab({ panes: [shell("one"), shell("two")] });
		const terminals = center.getState().getActiveTab();
		if (!terminals) throw Error("Expected terminal tab");
		center.getState().addTab({
			panes: [
				{ kind: "chat-v3", data: { terminalId: "chat", sessionId: null } },
			],
		});
		const chatId = center.getState().activeTabId;
		let closed = 0;
		center.getState().subscribePaneClose(() => closed++);
		expect(dockTerminalPanes(center, right, dock)).toBe(true);
		expect(dock.getState().tabs[0]).toEqual(terminals);
		expect(center.getState().activeTabId).toBe(chatId);
		expect(center.getState().tabs).toHaveLength(1);
		expect(closed).toBe(0);
		expect(dockTerminalPanes(center, right, dock)).toBe(false);
	});
	test("separates an existing review/terminal split while preserving both panes", () => {
		const center = makeStore(),
			right = makeStore(),
			dock = makeStore();
		right.getState().addTab({
			panes: [
				{
					kind: "diff",
					data: { path: "", collapsedFiles: [], sidebarTab: "review" },
				},
				shell("shell"),
			],
		});
		const original = Object.values(right.getState().tabs[0]?.panes ?? {});
		dockTerminalPanes(center, right, dock);
		expect(Object.values(right.getState().tabs[0]?.panes ?? {})).toEqual([
			original[0],
		]);
		expect(Object.values(dock.getState().tabs[0]?.panes ?? {})).toEqual([
			original[1],
		]);
	});
	test("keeps an explicit terminal split beside a conversation", () => {
		const center = makeStore(),
			right = makeStore(),
			dock = makeStore();
		center.getState().addTab({
			panes: [
				{ kind: "chat-v3", data: { terminalId: "chat", sessionId: null } },
				shell("explicit-split"),
			],
		});
		const tab = center.getState().getActiveTab();
		expect(dockTerminalPanes(center, right, dock)).toBe(false);
		expect(center.getState().getActiveTab()).toEqual(tab);
		expect(dock.getState().tabs).toHaveLength(0);
	});
	test("returns a terminal session opened as chat to the conversation area", () => {
		const center = makeStore(),
			right = makeStore(),
			dock = makeStore();
		dock.getState().addTab({
			panes: [
				{
					kind: "chat-v3",
					data: { terminalId: "same", sessionId: "session" },
				},
			],
		});
		const tab = dock.getState().getActiveTab();
		dockTerminalPanes(center, right, dock);
		expect(dock.getState().tabs).toHaveLength(0);
		expect(center.getState().getActiveTab()).toEqual(tab);
	});
});
