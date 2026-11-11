import { useLiveQuery } from "@tanstack/react-db";
import { createContext, useContext, useMemo } from "react";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";
import { useTagFolderWorkspaces } from "renderer/routes/_authenticated/providers/TagFolderWorkspacesProvider";
import {
	deriveTagFolders,
	useTagFolderContext,
} from "renderer/routes/_authenticated/utils/workspaceTagFolders";
import {
	buildNavigationSections,
	type NavigationSection,
} from "./utils/buildNavigationSections/buildNavigationSections";

export const NavigationSectionsContext = createContext<{
	sections: NavigationSection[];
	create: (workspaceIds?: string[]) => void;
	move: (workspaceId: string, sectionId: string | null) => void;
} | null>(null);

export const useNavigationSections = () =>
	useContext(NavigationSectionsContext);

export function useNavigationSectionData() {
	const collections = useCollections();
	const { workspaces } = useTagFolderWorkspaces();
	const context = useTagFolderContext();
	const { data: stored = [] } = useLiveQuery(
		(q) => q.from({ section: collections.v2SidebarSections }),
		[collections],
	);
	return useMemo(
		() =>
			buildNavigationSections(deriveTagFolders(stored, workspaces, context)),
		[stored, workspaces, context],
	);
}
