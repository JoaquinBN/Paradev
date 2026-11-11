import { Trans, useLingui } from "@lingui/react/macro";
import { formatNumber } from "@superset/i18n/format";
import type { PaneRegistry, Tab } from "@superset/panes";
import { Button } from "@superset/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { TabsList, TabsTrigger } from "@superset/ui/tabs";
import { cn } from "@superset/ui/utils";
import {
	ChevronDown,
	Eye,
	FileDiff,
	Maximize2,
	Minimize2,
	PanelsTopLeft,
	Plus,
} from "lucide-react";
import { type ReactNode, useMemo, useRef } from "react";
import { useChangeset } from "../../../../hooks/useChangeset";
import { useSidebarDiffRef } from "../../../../hooks/useSidebarDiffRef";
import type { PaneViewerData } from "../../../../types";
import { RightPaneToolMenuItem } from "./components/RightPaneToolMenuItem";

interface RightPaneNavigationProps {
	className?: string;
	workspaceId: string;
	tabs: Tab<PaneViewerData>[];
	toolTabs: Tab<PaneViewerData>[];
	activeTabId: string | null;
	registry: PaneRegistry<PaneViewerData>;
	onSelectTool: (tab: Tab<PaneViewerData>) => void;
	onAddTool: () => void;
	leading?: ReactNode;
	activity: ReactNode;
	onOpenDiff: () => void;
	isFullScreen: boolean;
	onToggleFullScreen: () => void;
}

export function RightPaneNavigation({
	className,
	workspaceId,
	tabs,
	toolTabs,
	activeTabId,
	registry,
	onSelectTool,
	onAddTool,
	leading,
	activity,
	onOpenDiff,
	isFullScreen,
	onToggleFullScreen,
}: RightPaneNavigationProps) {
	const { t } = useLingui();
	const ref = useSidebarDiffRef(workspaceId);
	const { files } = useChangeset({ workspaceId, ref });
	const count = useMemo(
		() => new Set(files.map((file) => file.path)).size,
		[files],
	);
	const pendingTool = useRef<(() => void) | null>(null);
	return (
		<div
			data-design-surface="review-navigation"
			className={cn(
				"@container/review-navigation flex h-10 min-w-0 shrink-0 items-center gap-1 border-b border-border/60 bg-sidebar px-2",
				className,
			)}
		>
			{leading}
			<TabsList
				aria-label={t({ message: "Workspace" })}
				className="h-full min-w-0 flex-1 justify-start gap-0 rounded-none bg-transparent p-0"
			>
				<TabsTrigger
					value="files"
					className="h-8 min-w-0 flex-initial px-2 text-xs"
				>
					<span className="truncate">
						<Trans>Files</Trans>
					</span>
				</TabsTrigger>
				<TabsTrigger
					value="changes"
					className="h-8 min-w-0 flex-initial px-2 text-xs"
				>
					<span className="truncate">
						<Trans>Changes</Trans>
					</span>
					<span className="hidden shrink-0 text-muted-foreground tabular-nums @[340px]/review-navigation:inline">
						{formatNumber(count)}
					</span>
				</TabsTrigger>
				<TabsTrigger
					value="review"
					className="h-8 min-w-0 flex-initial px-2 text-xs"
				>
					<Eye className="hidden size-3.5 shrink-0 @[360px]/review-navigation:block" />
					<span className="truncate">
						<Trans>Review</Trans>
					</span>
				</TabsTrigger>
			</TabsList>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className={cn(
							"h-8 w-8 shrink-0 gap-1 @[340px]/review-navigation:w-10",
							toolTabs.some((tab) => tab.id === activeTabId) &&
								"bg-accent text-foreground",
						)}
						aria-label={t({ message: "Tools" })}
						title={t({ message: "Tools" })}
					>
						<PanelsTopLeft className="size-3.5" />
						<ChevronDown className="hidden size-3 @[340px]/review-navigation:block" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					className="w-64"
					onCloseAutoFocus={(event) => {
						const action = pendingTool.current;
						pendingTool.current = null;
						if (action) {
							event.preventDefault();
							action();
						}
					}}
				>
					<DropdownMenuItem
						onSelect={() => {
							pendingTool.current = onOpenDiff;
						}}
					>
						<FileDiff className="size-3.5" />
						<Trans>Open Diff</Trans>
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => {
							pendingTool.current = onToggleFullScreen;
						}}
					>
						{isFullScreen ? (
							<Minimize2 className="size-3.5" />
						) : (
							<Maximize2 className="size-3.5" />
						)}
						{isFullScreen ? (
							<Trans>Restore width</Trans>
						) : (
							<Trans>Expand</Trans>
						)}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					{toolTabs.map((tab) => (
						<RightPaneToolMenuItem
							key={tab.id}
							tab={tab}
							tabs={tabs}
							registry={registry}
							isActive={tab.id === activeTabId}
							onSelect={() => {
								pendingTool.current = () => onSelectTool(tab);
							}}
						/>
					))}
					{toolTabs.length > 0 && <DropdownMenuSeparator />}
					<DropdownMenuItem
						onSelect={() => {
							pendingTool.current = onAddTool;
						}}
					>
						<Plus className="size-3.5" />
						<Trans>New Tab</Trans>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			{activity}
		</div>
	);
}
