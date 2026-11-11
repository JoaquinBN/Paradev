import type { PaneActionConfig } from "@superset/panes";
import { useMemo } from "react";
import { HiMiniXMark } from "react-icons/hi2";
import type { PaneViewerData } from "../../types";

export function useDefaultPaneActions(): PaneActionConfig<PaneViewerData>[] {
	return useMemo(
		() => [
			{
				key: "close",
				icon: <HiMiniXMark className="size-3.5" />,
				onClick: (ctx) => ctx.actions.close(),
			},
		],
		[],
	);
}
