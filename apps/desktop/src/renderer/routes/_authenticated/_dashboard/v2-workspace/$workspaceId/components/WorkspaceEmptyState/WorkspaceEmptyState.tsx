import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import { useMemo } from "react";
import type { IconType } from "react-icons";
import { BsTerminalPlus } from "react-icons/bs";
import { LuGitCompareArrows, LuMessageSquare, LuSearch } from "react-icons/lu";
import { TbWorld } from "react-icons/tb";
import { useHotkeyDisplay } from "renderer/hotkeys";
import { EmptyTabActionButton } from "renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/components/EmptyTabActionButton";

interface WorkspaceEmptyStateProps {
	onOpenBrowser: () => void;
	onOpenChanges: () => void;
	onOpenChat?: (() => void) | undefined;
	onOpenQuickOpen: () => void;
	onOpenTerminal: () => void;
}

interface WorkspaceEmptyStateAction {
	display: string[];
	icon: IconType;
	id: string;
	label: string;
	onClick: () => void;
}

export function WorkspaceEmptyState({
	onOpenBrowser,
	onOpenChanges,
	onOpenChat,
	onOpenQuickOpen,
	onOpenTerminal,
}: WorkspaceEmptyStateProps) {
	const { t } = useLingui();
	const { keys: newGroupDisplay } = useHotkeyDisplay("NEW_GROUP");
	const { keys: newBrowserDisplay } = useHotkeyDisplay("NEW_BROWSER");
	const { keys: quickOpenDisplay } = useHotkeyDisplay("QUICK_OPEN");
	const { keys: openChangesDisplay } = useHotkeyDisplay("OPEN_DIFF_VIEWER");

	const actions = useMemo<Array<WorkspaceEmptyStateAction>>(
		() => [
			{
				id: "terminal",
				label: t({
					message: "Open Terminal",
				}),
				display: newGroupDisplay,
				icon: BsTerminalPlus,
				onClick: onOpenTerminal,
			},
			{
				id: "browser",
				label: t({
					message: "Open Browser",
				}),
				display: newBrowserDisplay,
				icon: TbWorld,
				onClick: onOpenBrowser,
			},
			{
				id: "changes",
				label: t({
					message: "Open Changes",
				}),
				display: openChangesDisplay,
				icon: LuGitCompareArrows,
				onClick: onOpenChanges,
			},
			{
				id: "search-files",
				label: t({
					message: "Search Files",
				}),
				display: quickOpenDisplay,
				icon: LuSearch,
				onClick: onOpenQuickOpen,
			},
		],
		[
			newBrowserDisplay,
			newGroupDisplay,
			onOpenBrowser,
			onOpenChanges,
			onOpenQuickOpen,
			onOpenTerminal,
			openChangesDisplay,
			quickOpenDisplay,
			t,
		],
	);

	return (
		<div className="flex h-full flex-1 items-center justify-center px-6 py-10">
			<div className="w-full max-w-xl">
				<div className="mb-8 space-y-3 text-center">
					<LuMessageSquare className="mx-auto size-7 text-muted-foreground/50" />
					<h1 className="text-xl font-medium tracking-tight">
						<Trans>What should we build next?</Trans>
					</h1>
					{onOpenChat && (
						<Button onClick={onOpenChat} className="mt-3 gap-2">
							<LuMessageSquare className="size-4" />
							<Trans>Open Chat</Trans>
						</Button>
					)}
				</div>

				<div className="mx-auto grid w-full max-w-md gap-0.5">
					{actions.map((action) => (
						<EmptyTabActionButton
							key={action.id}
							display={action.display}
							icon={action.icon}
							label={action.label}
							onClick={action.onClick}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
