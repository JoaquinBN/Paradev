import { Trans } from "@lingui/react/macro";
import type { RouterOutputs } from "@superset/trpc";
import { cn } from "@superset/ui/utils";
import { LuClock, LuWorkflow } from "react-icons/lu";

type Automation = RouterOutputs["automation"]["list"][number];

interface WankCardProps {
	automation: Automation;
	onOpen: () => void;
}

export function WankCard({ automation, onOpen }: WankCardProps) {
	return (
		<button
			type="button"
			onClick={onOpen}
			className="group flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground/20 hover:bg-fill-hover"
		>
			<div className="flex items-center justify-between gap-2">
				<span
					className={cn(
						"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
						automation.enabled
							? "bg-green-500/10 text-green-600 dark:text-green-400"
							: "bg-muted text-muted-foreground",
					)}
				>
					<span
						className={cn(
							"size-1.5 rounded-full",
							automation.enabled ? "bg-green-500" : "bg-muted-foreground",
						)}
					/>
					{automation.enabled ? <Trans>Active</Trans> : <Trans>Paused</Trans>}
				</span>
				<LuWorkflow className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
			</div>
			<span className="line-clamp-2 font-medium">{automation.name}</span>
			<span className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
				<LuClock className="size-3.5 shrink-0" />
				<span className="truncate">
					{automation.scheduleText ?? <Trans>Runs on demand</Trans>}
				</span>
			</span>
		</button>
	);
}
