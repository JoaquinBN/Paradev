import { Trans } from "@lingui/react/macro";
import { LuPlus } from "react-icons/lu";
import { SidebarKbdHint } from "renderer/components/SidebarKbdHint";
import { useHotkeyDisplay } from "renderer/hotkeys";
import { useOpenNewWorkspaceInViewedProject } from "renderer/routes/_authenticated/_dashboard/hooks/useOpenNewWorkspaceInViewedProject";
import { STROKE_WIDTH_THICK } from "renderer/screens/main/components/WorkspaceSidebar/constants";

export function SidebarNewWorkspaceButton() {
	const openNewWorkspace = useOpenNewWorkspaceInViewedProject();
	const shortcutText = useHotkeyDisplay("NEW_WORKSPACE").text;
	return (
		<button
			type="button"
			onClick={openNewWorkspace}
			className="group flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground"
		>
			<div className="flex size-4 shrink-0 items-center justify-center">
				<LuPlus className="size-4" strokeWidth={STROKE_WIDTH_THICK} />
			</div>
			<span className="flex-1 truncate text-left whitespace-nowrap">
				<Trans>Create</Trans>
			</span>
			<SidebarKbdHint label={shortcutText} />
		</button>
	);
}
