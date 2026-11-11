import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import {
	FileDiff,
	FolderTree,
	GitBranch,
	MessageSquarePlus,
	MoreHorizontal,
	Terminal,
} from "lucide-react";
import type { ReactNode } from "react";
import { useWorkspace } from "../../../providers/WorkspaceProvider";

interface WorkspaceFocusHeaderProps {
	onOpenChat: () => void;
	onOpenChanges: () => void;
	onOpenFiles: () => void;
	onOpenTerminal: () => void;
	scripts: ReactNode;
}

export function WorkspaceFocusHeader({
	onOpenChat,
	onOpenChanges,
	onOpenFiles,
	onOpenTerminal,
	scripts,
}: WorkspaceFocusHeaderProps) {
	const { workspace } = useWorkspace();
	const { t } = useLingui();
	return (
		<header
			data-design-surface="workspace-header"
			className="@container flex min-h-12 shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4"
		>
			<div className="flex min-w-0 flex-1 items-center gap-3 py-2">
				<span
					className="truncate text-[13px] font-semibold"
					title={workspace.name}
				>
					{workspace.name}
				</span>
				{workspace.branch && (
					<span className="hidden min-w-0 items-center gap-1.5 border-l border-border pl-3 text-[11px] text-muted-foreground @[32rem]:flex">
						<GitBranch className="size-3 shrink-0" />
						<span className="truncate" title={workspace.branch}>
							{workspace.branch}
						</span>
					</span>
				)}
			</div>
			<nav
				className="flex shrink-0 items-center gap-1"
				aria-label={t({ message: "Workspace" })}
			>
				{scripts}
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					onClick={onOpenTerminal}
					aria-label={t({ message: "Open Terminal" })}
					title={t({ message: "Open Terminal" })}
				>
					<Terminal className="size-4" />
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							aria-label={t({ message: "More options" })}
						>
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={onOpenFiles}>
							<FolderTree />
							<Trans>Files</Trans>
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={onOpenChanges}>
							<FileDiff />
							<Trans>Changes</Trans>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<Button
					variant="secondary"
					size="sm"
					className="ml-1 h-8 gap-1.5 px-2.5 text-xs"
					onClick={onOpenChat}
					aria-label={t({ message: "New Chat" })}
				>
					<MessageSquarePlus className="size-3.5" />
					<Trans>New Chat</Trans>
				</Button>
			</nav>
		</header>
	);
}
