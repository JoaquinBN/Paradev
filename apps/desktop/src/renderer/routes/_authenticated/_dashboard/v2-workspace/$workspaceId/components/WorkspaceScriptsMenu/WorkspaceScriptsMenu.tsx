import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@superset/ui/popover";
import { ListStart } from "lucide-react";
import { type ComponentProps, useRef, useState } from "react";
import { V2PresetsBar } from "../V2PresetsBar";

export function WorkspaceScriptsMenu(
	props: ComponentProps<typeof V2PresetsBar>,
) {
	const { t } = useLingui();
	const [open, setOpen] = useState(false);
	const pending = useRef<(() => void) | null>(null);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					aria-label={t({ message: "Terminal Scripts" })}
					title={t({ message: "Terminal Scripts" })}
				>
					<ListStart className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-72 max-w-[calc(100vw-24px)] p-2"
				data-design-surface="workspace-launchers"
				onCloseAutoFocus={(event) => {
					const action = pending.current;
					pending.current = null;
					if (!action) return;
					event.preventDefault();
					queueMicrotask(action);
				}}
			>
				<div className="px-2 py-2 text-xs font-medium">
					<Trans>Terminal Scripts</Trans>
				</div>
				<V2PresetsBar
					{...props}
					layout="menu"
					executePreset={(preset) => {
						pending.current = () => {
							void props.executePreset(preset);
						};
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
