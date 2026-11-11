import { useDroppable } from "@dnd-kit/core";
import { Trans, useLingui } from "@lingui/react/macro";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { cn } from "@superset/ui/utils";
import type { ReactNode } from "react";
import { LuChevronRight, LuEllipsis } from "react-icons/lu";
import type { NavigationSection as Section } from "renderer/routes/_authenticated/hooks/useNavigationSections/utils/buildNavigationSections/buildNavigationSections";

export function NavigationSection({
	section,
	onToggle,
	onRename,
	onRemove,
	onCreate,
	children,
	header,
}: {
	section: Section | null;
	onToggle?: () => void;
	onRename?: () => void;
	onRemove?: () => void;
	onCreate?: () => void;
	children: ReactNode;
	header?: ReactNode;
}) {
	const { t } = useLingui();
	const { setNodeRef, isOver } = useDroppable({
		id: `navigation:${section?.id ?? "default"}`,
		data: { navigationSectionId: section?.id ?? null },
	});
	return (
		<section
			ref={setNodeRef}
			data-navigation-section={section?.id ?? "default"}
			className={cn(
				"mt-3 rounded-md pb-1 transition-colors first:mt-0",
				isOver && "bg-accent/60 ring-1 ring-inset ring-ring/40",
			)}
		>
			{header ?? (
				<div className="group/section mx-2 flex h-8 items-center gap-1 text-xs font-medium text-muted-foreground">
					<button
						type="button"
						onClick={onToggle}
						aria-expanded={!section?.isCollapsed}
						className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<span className="truncate">{section?.name}</span>
						<LuChevronRight
							className={cn(
								"size-3 shrink-0 transition-transform",
								!section?.isCollapsed && "rotate-90",
							)}
						/>
					</button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								aria-label={t({ message: "Section actions" })}
								className="flex size-6 items-center justify-center rounded hover:bg-fill-hover focus-visible:ring-2 focus-visible:ring-ring"
							>
								<LuEllipsis className="size-4" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuItem onSelect={onCreate}>
								<Trans>New section</Trans>
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={onRename}>
								<Trans>Rename section</Trans>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onSelect={onRemove}>
								<Trans>Remove section</Trans>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}
			{!section?.isCollapsed && children}
		</section>
	);
}
