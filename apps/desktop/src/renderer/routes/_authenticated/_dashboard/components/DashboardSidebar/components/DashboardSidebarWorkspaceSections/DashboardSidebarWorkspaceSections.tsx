import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	pointerWithin,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Trans, useLingui } from "@lingui/react/macro";
import { tagFolderScope } from "@superset/shared/workspace-tags";
import { type ReactNode, useMemo, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { useOpenNewSession } from "renderer/hooks/useOpenNewWorkspace";
import { useDashboardSidebarState } from "renderer/routes/_authenticated/hooks/useDashboardSidebarState";
import {
	NavigationSectionsContext,
	useNavigationSectionData,
} from "renderer/routes/_authenticated/hooks/useNavigationSections";
import type { NavigationSection as Section } from "renderer/routes/_authenticated/hooks/useNavigationSections/utils/buildNavigationSections/buildNavigationSections";
import { parseSidebarFolderKey } from "renderer/routes/_authenticated/utils/workspaceTagFolders";
import { useNewWorkspaceDraftStore } from "renderer/stores/new-workspace-draft";
import { useSidebarSectionsCollapseStore } from "renderer/stores/sidebar-sections-collapse";
import { parseId, SESSIONS_CONTAINER } from "../../hooks/useSidebarDnd";
import type {
	DashboardSidebarProject,
	DashboardSidebarProjectChild,
	DashboardSidebarWorkspace,
} from "../../types";
import { getProjectChildrenWorkspaces } from "../../utils/projectChildren";
import { DashboardSidebarProjectSection } from "../DashboardSidebarProjectSection";
import { DashboardSidebarExpandedProjectContent } from "../DashboardSidebarProjectSection/components/DashboardSidebarExpandedProjectContent";
import { NavigationSection } from "./components/NavigationSection/NavigationSection";
import { SectionDialog } from "./components/SectionDialog/SectionDialog";

export function DashboardSidebarWorkspaceSections({
	projects,
	isFiltered,
	sessionChildren,
	sessionWorkspaces,
	workspaceShortcutLabels,
	onWorkspaceHover,
	onToggleProject,
	header,
	children,
}: {
	projects: DashboardSidebarProject[];
	isFiltered: boolean;
	sessionChildren: DashboardSidebarProjectChild[];
	sessionWorkspaces: DashboardSidebarWorkspace[];
	workspaceShortcutLabels: Map<string, string>;
	onWorkspaceHover: (id: string) => void | Promise<void>;
	onToggleProject: (id: string) => void;
	header: ReactNode;
	children?: ReactNode;
}) {
	const { t } = useLingui();
	const sections = useNavigationSectionData();
	const actions = useDashboardSidebarState();
	const openSession = useOpenNewSession();
	const defaultCollapsed = useSidebarSectionsCollapseStore(
		(s) => s.collapsed.workspaces,
	);
	const [dialog, setDialog] = useState<{
		section?: Section;
		workspaceIds?: string[];
	} | null>(null);
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);
	const workspaces = useMemo(
		() =>
			new Map(
				[
					...projects.flatMap((project) =>
						getProjectChildrenWorkspaces(project.children),
					),
					...sessionWorkspaces,
				].map((workspace) => [workspace.id, workspace]),
			),
		[projects, sessionWorkspaces],
	);
	const locations = useMemo(() => {
		const result = new Map<string, string | null>();
		for (const child of [
			...projects.flatMap((project) => project.children),
			...sessionChildren,
		]) {
			if (child.type === "workspace") result.set(child.workspace.id, null);
			else {
				const section = sections.find((item) =>
					item.folders.some((folder) => folder.sectionId === child.section.id),
				);
				for (const workspace of child.section.workspaces)
					result.set(workspace.id, section?.id ?? null);
			}
		}
		return result;
	}, [projects, sessionChildren, sections]);
	const ensureFolder = (section: Section, projectId: string | null) =>
		section.folders.find(
			(folder) => folder.projectId === tagFolderScope(projectId),
		)?.sectionId ??
		actions.createSection(projectId, {
			name: section.name,
			tag: section.tag ?? undefined,
		});
	const move = (workspaceId: string, sectionId: string | null) => {
		const workspace = workspaces.get(workspaceId);
		if (!workspace || locations.get(workspaceId) === sectionId) return;
		const target = sections.find((section) => section.id === sectionId);
		if (sectionId !== null && !target) return;
		actions.moveWorkspaceToSection(
			workspaceId,
			workspace.projectId,
			target ? ensureFolder(target, workspace.projectId) : null,
		);
		if (target?.isCollapsed)
			for (const folder of target.folders)
				actions.toggleSectionCollapsed(folder.sectionId);
	};
	const handleDrop = ({ active, over }: DragEndEvent) => {
		setDraggedId(null);
		const parsed = parseId(active.id);
		if (!over || parsed?.type !== "workspace") return;
		const workspace = workspaces.get(parsed.realId);
		if (!workspace) return;
		const overParsed = parseId(over.id);
		const targetWorkspace =
			overParsed?.type === "workspace"
				? workspaces.get(overParsed.realId)
				: undefined;
		const targetId = targetWorkspace
			? locations.get(targetWorkspace.id)
			: over.data.current?.navigationSectionId;
		if (targetId === undefined) return;
		move(workspace.id, targetId);
		if (
			!targetWorkspace ||
			targetWorkspace.projectId !== workspace.projectId ||
			targetWorkspace.id === workspace.id
		)
			return;
		const siblings = [...workspaces.values()]
			.filter(
				(item) =>
					item.projectId === workspace.projectId &&
					locations.get(item.id) === targetId,
			)
			.map((item) => item.id);
		if (!siblings.includes(workspace.id)) siblings.push(workspace.id);
		const ordered = arrayMove(
			siblings,
			siblings.indexOf(workspace.id),
			siblings.indexOf(targetWorkspace.id),
		);
		const section = sections.find((item) => item.id === targetId);
		if (section)
			actions.setSectionWorkspaceOrder(
				workspace.projectId,
				ensureFolder(section, workspace.projectId),
				ordered,
			);
		else actions.reorderWorkspaces(ordered);
	};
	const renderProjects = (section: Section | null) => {
		const rows = projects.flatMap((project) => {
			const folder = section?.folders.find(
				(item) => item.projectId === project.id,
			);
			if (section && !folder) return [];
			const children = project.children.filter((child) =>
				section
					? child.type === "section" && child.section.id === folder?.sectionId
					: child.type === "workspace",
			);
			if (
				section
					? children.length === 0
					: children.length === 0 && project.children.length > 0
			)
				return [];
			return [
				<DashboardSidebarProjectSection
					key={project.id}
					project={{ ...project, children }}
					sectionIdFilter={folder?.sectionId ?? null}
					workspaceShortcutLabels={workspaceShortcutLabels}
					onWorkspaceHover={onWorkspaceHover}
					onToggleCollapse={onToggleProject}
				/>,
			];
		});
		const sessionFolder = section?.folders.find(
			(folder) => folder.projectId === tagFolderScope(null),
		);
		const sessions = sessionWorkspaces.filter(
			(workspace) => locations.get(workspace.id) === (section?.id ?? null),
		);
		return (
			<>
				{rows}
				{sessions.length > 0 && (
					<div>
						<div className="mx-2 mt-2 flex h-8 items-center justify-between px-2 text-xs font-medium text-muted-foreground">
							<Trans>No project</Trans>
							<button
								type="button"
								onClick={openSession}
								className="rounded p-1 hover:bg-fill-hover"
								aria-label={t({ message: "Workspace without a project" })}
							>
								<LuPlus className="size-3.5" />
							</button>
						</div>
						<DashboardSidebarExpandedProjectContent
							containerId={SESSIONS_CONTAINER}
							projectId={null}
							sectionIdFilter={sessionFolder?.sectionId ?? null}
							isCollapsed={false}
							workspaceShortcutLabels={workspaceShortcutLabels}
							onWorkspaceHover={onWorkspaceHover}
							onDeleteSection={actions.deleteSection}
							onRenameSection={actions.renameSection}
							onToggleSectionCollapse={actions.toggleSectionCollapsed}
						/>
					</div>
				)}
				{section && rows.length === 0 && sessions.length === 0 && (
					<p className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">
						<Trans>Drag a workspace here or use Move to section.</Trans>
					</p>
				)}
			</>
		);
	};
	return (
		<NavigationSectionsContext.Provider
			value={{
				sections,
				create: (workspaceIds) => setDialog({ workspaceIds }),
				move,
			}}
		>
			<DndContext
				sensors={sensors}
				collisionDetection={(args) => {
					const collisions = args.pointerCoordinates
						? pointerWithin(args)
						: closestCenter(args);
					const workspace = collisions.find(
						(collision) => parseId(collision.id)?.type === "workspace",
					);
					return workspace
						? [workspace]
						: collisions
								.filter((collision) =>
									String(collision.id).startsWith("navigation:"),
								)
								.slice(0, 1);
				}}
				onDragStart={({ active }) => {
					const parsed = parseId(active.id);
					setDraggedId(parsed?.type === "workspace" ? parsed.realId : null);
				}}
				onDragCancel={() => setDraggedId(null)}
				onDragEnd={handleDrop}
			>
				<NavigationSection section={null} header={header}>
					{!defaultCollapsed && renderProjects(null)}
				</NavigationSection>
				{sections
					.filter(
						(section) =>
							!isFiltered ||
							[...workspaces.keys()].some(
								(id) => locations.get(id) === section.id,
							),
					)
					.map((section) => (
						<NavigationSection
							key={section.id}
							section={
								isFiltered ? { ...section, isCollapsed: false } : section
							}
							onCreate={() => setDialog({})}
							onRename={() => setDialog({ section })}
							onRemove={() => {
								for (const folder of section.folders)
									actions.deleteSection(folder.sectionId);
								if (
									useNewWorkspaceDraftStore.getState().sectionTag ===
									section.tag
								)
									useNewWorkspaceDraftStore
										.getState()
										.updateDraft({ sectionTag: null });
							}}
							onToggle={() => {
								for (const folder of section.folders)
									if (folder.isCollapsed === section.isCollapsed)
										actions.toggleSectionCollapsed(folder.sectionId);
							}}
						>
							{renderProjects(section)}
						</NavigationSection>
					))}
				<DragOverlay dropAnimation={null}>
					{draggedId && (
						<div className="rounded-md border border-border bg-sidebar px-3 py-2 text-xs shadow-lg">
							{workspaces.get(draggedId)?.name}
						</div>
					)}
				</DragOverlay>
			</DndContext>
			{children}
			{dialog && (
				<SectionDialog
					name={dialog.section?.name}
					onClose={() => setDialog(null)}
					onSave={(name) => {
						if (dialog.section)
							for (const folder of dialog.section.folders)
								actions.renameSection(folder.sectionId, name);
						else {
							const selected = (dialog.workspaceIds ?? []).flatMap((id) => {
								const workspace = workspaces.get(id);
								return workspace ? [workspace] : [];
							});
							const projectId = selected[0]?.projectId ?? null;
							const id = actions.createSection(projectId, { name });
							for (const workspace of selected) {
								const target =
									workspace.projectId === projectId
										? id
										: actions.createSection(workspace.projectId, {
												name,
												tag: parseSidebarFolderKey(id)?.tag,
											});
								actions.moveWorkspaceToSection(
									workspace.id,
									workspace.projectId,
									target,
								);
							}
						}
						setDialog(null);
					}}
				/>
			)}
		</NavigationSectionsContext.Provider>
	);
}
