export interface NavigationFolder {
	sectionId: string;
	projectId: string;
	tag: string | null;
	name: string;
	color: string | null;
	isCollapsed: boolean;
	createdAt: Date | string;
	isDerived?: boolean;
}

export interface NavigationSection {
	id: string;
	tag: string | null;
	name: string;
	color: string | null;
	isCollapsed: boolean;
	folders: NavigationFolder[];
}

export function buildNavigationSections(
	folders: readonly NavigationFolder[],
): NavigationSection[] {
	const sections = new Map<string, NavigationSection>();
	for (const folder of [...folders].sort(
		(a, b) =>
			Number(a.isDerived ?? false) - Number(b.isDerived ?? false) ||
			new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
			a.sectionId.localeCompare(b.sectionId),
	)) {
		const id = folder.tag ?? folder.sectionId;
		const existing = sections.get(id);
		if (existing) {
			existing.folders.push(folder);
			existing.isCollapsed &&= folder.isCollapsed;
		} else {
			sections.set(id, {
				id,
				tag: folder.tag,
				name: folder.name,
				color: folder.color,
				isCollapsed: folder.isCollapsed,
				folders: [folder],
			});
		}
	}
	return [...sections.values()];
}
