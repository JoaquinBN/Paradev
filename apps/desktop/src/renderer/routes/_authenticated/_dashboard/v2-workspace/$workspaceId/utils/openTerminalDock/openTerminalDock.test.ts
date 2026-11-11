import { describe, expect, test } from "bun:test";
import { createWorkspaceStore } from "@superset/panes";
import type { PaneViewerData } from "../../types";
import { openTerminalDock } from "./openTerminalDock";

describe("opening the terminal dock", () => {
	test("focuses the current terminal without creating another process", () => {
		const store = createWorkspaceStore<PaneViewerData>();
		let minted = 0;
		const mint = () => `terminal-${++minted}`;
		openTerminalDock(store, mint);
		openTerminalDock(store, mint);
		expect(minted).toBe(1);
		expect(store.getState().tabs).toHaveLength(1);
		expect(store.getState().focusRequest?.paneId).toBe(
			store.getState().getActivePane()?.pane.id,
		);
	});
	test("creates a separate shell without replacing the previous session", () => {
		const store = createWorkspaceStore<PaneViewerData>();
		openTerminalDock(store, () => "first");
		openTerminalDock(store, () => "second", true);
		expect(
			store
				.getState()
				.tabs.flatMap((tab) =>
					Object.values(tab.panes).map((pane) => pane.data),
				),
		).toEqual([
			{ terminalId: "first", createOnAttach: true },
			{ terminalId: "second", createOnAttach: true },
		]);
	});
});
