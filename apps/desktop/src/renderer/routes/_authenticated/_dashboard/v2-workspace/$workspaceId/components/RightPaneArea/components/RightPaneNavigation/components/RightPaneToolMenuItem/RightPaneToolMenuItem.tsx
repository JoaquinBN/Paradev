import { type PaneRegistry, type Tab, useTabTitle } from "@superset/panes";
import { DropdownMenuItem } from "@superset/ui/dropdown-menu";
import { Check } from "lucide-react";
import type { PaneViewerData } from "../../../../../../types";

interface RightPaneToolMenuItemProps {
	tab: Tab<PaneViewerData>;
	tabs: Tab<PaneViewerData>[];
	registry: PaneRegistry<PaneViewerData>;
	isActive: boolean;
	onSelect: () => void;
}

export function RightPaneToolMenuItem({
	tab,
	tabs,
	registry,
	isActive,
	onSelect,
}: RightPaneToolMenuItemProps) {
	const title = useTabTitle(tab, tabs, registry);
	return (
		<DropdownMenuItem onSelect={onSelect}>
			<span className="min-w-0 flex-1 truncate">{title}</span>
			{isActive && <Check className="size-3.5 shrink-0" />}
		</DropdownMenuItem>
	);
}
