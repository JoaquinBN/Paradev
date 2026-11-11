import { Trans, useLingui } from "@lingui/react/macro";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { LuChevronDown, LuFolder } from "react-icons/lu";
import { useNavigationSectionData } from "renderer/routes/_authenticated/hooks/useNavigationSections";
import { useNewWorkspaceDraftStore } from "renderer/stores/new-workspace-draft";

export function WorkspaceSectionPicker() {
	const { t } = useLingui();
	const sections = useNavigationSectionData();
	const tag = useNewWorkspaceDraftStore((state) => state.sectionTag);
	const updateDraft = useNewWorkspaceDraftStore((state) => state.updateDraft);
	const current = sections.find((section) => section.tag === tag);
	if (sections.length === 0) return null;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={t({ message: "Section" })}
					className="flex h-7 min-w-0 max-w-48 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-fill-hover"
				>
					<LuFolder className="size-3.5 shrink-0" />
					<span className="truncate">
						{current?.name ?? t({ message: "My workspaces" })}
					</span>
					<LuChevronDown className="size-3 shrink-0" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				<DropdownMenuRadioGroup
					value={current?.tag ?? ""}
					onValueChange={(value) => updateDraft({ sectionTag: value || null })}
				>
					<DropdownMenuRadioItem value="">
						<Trans>My workspaces</Trans>
					</DropdownMenuRadioItem>
					{sections
						.filter((section) => section.tag !== null)
						.map((section) => (
							<DropdownMenuRadioItem key={section.id} value={section.tag ?? ""}>
								{section.name}
							</DropdownMenuRadioItem>
						))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
