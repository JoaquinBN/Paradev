import { Trans, useLingui } from "@lingui/react/macro";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { useEffect, useRef } from "react";
import { LuEllipsis } from "react-icons/lu";
import { useOpenNewSession } from "renderer/hooks/useOpenNewWorkspace";
import { AddProjectMenuItems } from "renderer/routes/_authenticated/_dashboard/components/AddProjectMenuItems";
import { useNavigationSections } from "renderer/routes/_authenticated/hooks/useNavigationSections";
import type {
	SidebarProjectHostFilter,
	SidebarProjectSortMode,
} from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal/schema";
import { useSidebarSectionsCollapseStore } from "renderer/stores/sidebar-sections-collapse";
import { DashboardSidebarSectionHeader } from "../DashboardSidebarSectionHeader";
import { DashboardSidebarProjectsFilterInput } from "./components/DashboardSidebarProjectsFilterInput";
import { useProjectFilterExpanded } from "./hooks/useProjectFilterExpanded";

interface DashboardSidebarWorkspacesHeaderProps {
	sortMode: SidebarProjectSortMode;
	onSortModeChange: (mode: SidebarProjectSortMode) => void;
	hostFilter: SidebarProjectHostFilter | null;
	onHostFilterChange: (filter: SidebarProjectHostFilter) => void;
	filterQuery: string;
	onFilterQueryChange: (query: string) => void;
}

export function DashboardSidebarWorkspacesHeader({
	sortMode,
	onSortModeChange,
	hostFilter,
	onHostFilterChange,
	filterQuery,
	onFilterQueryChange,
}: DashboardSidebarWorkspacesHeaderProps) {
	const { t } = useLingui();
	const navigationSections = useNavigationSections();
	const openSession = useOpenNewSession();
	const isCollapsed = useSidebarSectionsCollapseStore(
		(s) => s.collapsed.workspaces,
	);
	const toggle = useSidebarSectionsCollapseStore((s) => s.toggle);
	const [isFilterExpanded, setIsFilterExpanded] =
		useProjectFilterExpanded(filterQuery);
	const wasCollapsed = useRef(isCollapsed);
	useEffect(() => {
		if (isCollapsed && !wasCollapsed.current) {
			onFilterQueryChange("");
			setIsFilterExpanded(false);
		}
		wasCollapsed.current = isCollapsed;
	}, [isCollapsed, onFilterQueryChange, setIsFilterExpanded]);
	const expandFilter = () => {
		setIsFilterExpanded(true);
		if (isCollapsed) toggle("workspaces");
	};
	return (
		<DashboardSidebarSectionHeader
			label={t({ message: "My workspaces" })}
			section="workspaces"
			labelHidden={isFilterExpanded}
		>
			<DashboardSidebarProjectsFilterInput
				query={filterQuery}
				onQueryChange={onFilterQueryChange}
				isExpanded={isFilterExpanded}
				showTrigger={false}
				onExpandedChange={setIsFilterExpanded}
			/>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label={t({ message: "Workspace actions" })}
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => event.stopPropagation()}
						className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-fill-hover focus-visible:ring-2 focus-visible:ring-ring"
					>
						<LuEllipsis className="size-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="start"
					onCloseAutoFocus={(event) => {
						if (isFilterExpanded) event.preventDefault();
					}}
					onClick={(event) => event.stopPropagation()}
					onKeyDown={(event) => event.stopPropagation()}
				>
					<DropdownMenuItem onSelect={expandFilter}>
						<Trans>Filter by project</Trans>
					</DropdownMenuItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Trans>Sort by</Trans>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup
								value={sortMode}
								onValueChange={(value) =>
									onSortModeChange(value as SidebarProjectSortMode)
								}
							>
								<DropdownMenuRadioItem value="manual">
									<Trans>Manual order</Trans>
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="active">
									<Trans>Last active</Trans>
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="created">
									<Trans>Date created</Trans>
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					{hostFilter !== null && (
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<Trans>Show</Trans>
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuRadioGroup
									value={hostFilter}
									onValueChange={(value) =>
										onHostFilterChange(value as SidebarProjectHostFilter)
									}
								>
									<DropdownMenuRadioItem value="all">
										<Trans>All workspaces</Trans>
									</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="local">
										<Trans>Local</Trans>
									</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="cloud">
										<Trans>Cloud</Trans>
									</DropdownMenuRadioItem>
								</DropdownMenuRadioGroup>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
					)}
					<DropdownMenuSeparator />
					{navigationSections && (
						<DropdownMenuItem onSelect={() => navigationSections.create()}>
							<Trans>New section</Trans>
						</DropdownMenuItem>
					)}
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Trans>Add project</Trans>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<AddProjectMenuItems />
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuItem onSelect={openSession}>
						<Trans>Workspace without a project</Trans>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</DashboardSidebarSectionHeader>
	);
}
