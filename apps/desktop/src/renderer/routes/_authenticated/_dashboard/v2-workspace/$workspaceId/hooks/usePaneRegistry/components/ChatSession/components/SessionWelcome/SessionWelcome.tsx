import { Trans } from "@lingui/react/macro";
import { MessageSquare } from "lucide-react";

export function SessionWelcome() {
	return (
		<div
			data-design-surface="session-welcome"
			className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center"
		>
			<MessageSquare className="size-6 text-muted-foreground/40" />
			<h2 className="text-lg font-medium tracking-tight">
				<Trans>What should we build next?</Trans>
			</h2>
			<p className="max-w-sm text-sm leading-6 text-muted-foreground">
				<Trans>Describe a task, review a change, or investigate a bug.</Trans>
			</p>
		</div>
	);
}
