import { useLingui } from "@lingui/react/macro";
import type { ContextMenuActionConfig } from "@superset/panes";
import { useMemo } from "react";
import { LuX } from "react-icons/lu";
import { useHotkeyDisplay } from "renderer/hotkeys";
import type { PaneViewerData } from "../../types";

export function useDefaultContextMenuActions(): ContextMenuActionConfig<PaneViewerData>[] {
	const { t } = useLingui();
	const shortcut = useHotkeyDisplay("CLOSE_PANE").text;
	return useMemo(
		() => [
			{
				key: "close-pane",
				label: t({ message: "Close Pane" }),
				icon: <LuX />,
				variant: "destructive",
				shortcut: shortcut !== "Unassigned" ? shortcut : undefined,
				onSelect: (ctx) => ctx.actions.close(),
			},
		],
		[shortcut, t],
	);
}
