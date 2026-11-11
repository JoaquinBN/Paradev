import { Trans, useLingui } from "@lingui/react/macro";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { useRunAfterMenuClose } from "@superset/ui/hooks/use-run-after-menu-close";
import { LuEllipsis } from "react-icons/lu";

export function DashboardSidebarProjectActions({
	name,
	onCreate,
	onSettings,
	onImport,
	onHide,
	onDelete,
}: {
	name: string;
	onCreate: () => void;
	onSettings?: () => void;
	onImport?: () => void;
	onHide: () => void;
	onDelete?: () => void;
}) {
	const { t } = useLingui();
	const { runAfterClose, onCloseAutoFocus } = useRunAfterMenuClose();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={t({ message: `Actions for ${name}` })}
					onClick={(event) => event.stopPropagation()}
					onKeyDown={(event) => event.stopPropagation()}
					className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-fill-hover group-hover:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
				>
					<LuEllipsis className="size-4" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				onCloseAutoFocus={onCloseAutoFocus}
				onClick={(event) => event.stopPropagation()}
				onKeyDown={(event) => event.stopPropagation()}
			>
				<DropdownMenuItem onSelect={() => runAfterClose(onCreate)}>
					<Trans>New workspace</Trans>
				</DropdownMenuItem>
				{onImport && (
					<DropdownMenuItem onSelect={() => runAfterClose(onImport)}>
						<Trans>Import untracked worktrees</Trans>
					</DropdownMenuItem>
				)}
				{onSettings && (
					<DropdownMenuItem onSelect={() => runAfterClose(onSettings)}>
						<Trans>Project Settings</Trans>
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={onHide}>
					<Trans>Hide project</Trans>
				</DropdownMenuItem>
				{onDelete && (
					<DropdownMenuItem
						variant="destructive"
						onSelect={() => runAfterClose(onDelete)}
					>
						<Trans>Delete project</Trans>
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
