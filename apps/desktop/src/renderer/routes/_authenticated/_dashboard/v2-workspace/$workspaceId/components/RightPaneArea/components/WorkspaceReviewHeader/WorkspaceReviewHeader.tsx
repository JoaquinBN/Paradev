import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import { cn } from "@superset/ui/utils";
import { GitPullRequest, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { OpenPullRequestPane } from "renderer/lib/github/openPullRequestLink";
import { usePRFlowState } from "../../../../hooks/usePRFlowState";
import { PRStatusGroup } from "../../../ChangesControl/components/PRStatusGroup";
import { ShipControl } from "../../../ChangesControl/components/ShipControl";

interface WorkspaceReviewHeaderProps {
	workspaceId: string;
	onOpenReview: () => void;
	onOpenPullRequest: OpenPullRequestPane;
	toolbar: ReactNode;
}

export function WorkspaceReviewHeader({
	workspaceId,
	onOpenReview,
	onOpenPullRequest,
	toolbar,
}: WorkspaceReviewHeaderProps) {
	const { t } = useLingui();
	const { flowState, sync, onRetry } = usePRFlowState(workspaceId);
	const pr =
		flowState.kind === "pr-exists" ||
		flowState.kind === "error" ||
		flowState.kind === "busy"
			? flowState.pr
			: null;
	const unavailable = flowState.kind === "unavailable";
	const statusLabel = (() => {
		if (flowState.kind === "loading") return t({ message: "Loading..." });
		if (flowState.kind === "error")
			return t({ message: "Unable to load git status" });
		if (flowState.kind === "unavailable") {
			if (flowState.reason === "default-branch")
				return t({ message: "Default branch" });
			if (flowState.reason === "detached-head")
				return t({ message: "Detached" });
			return t({ message: "No Git remote" });
		}
		if (pr) {
			if (pr.state === "merged") return t({ message: "Merged" });
			if (pr.state === "closed") return t({ message: "Closed" });
			if (pr.isDraft) return t({ message: "Draft" });
			if (pr.state === "queued") return t({ message: "Queued" });
			if (pr.reviewDecision === "approved") return t({ message: "Approved" });
			if (pr.reviewDecision === "changes_requested")
				return t({ message: "Changes requested" });
			return t({ message: "Review pending" });
		}
		if (sync?.hasUncommitted) return t({ message: "Uncommitted" });
		if (sync && (!sync.hasUpstream || sync.pushCount > 0))
			return t({ message: "Unpushed" });
		if (sync && sync.pullCount > 0) return t({ message: "Behind remote" });
		return t({ message: "Up to date" });
	})();

	return (
		<header
			data-design-surface="workspace-review-header"
			className="flex h-12 min-w-0 shrink-0 items-center gap-2 border-b border-border/60 bg-sidebar px-3"
		>
			<div className="min-w-0 flex-1" title={statusLabel}>
				<output
					className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
					aria-label={t({ message: "Status" })}
				>
					{flowState.kind === "loading" ? (
						<LoaderCircle className="size-3 shrink-0 animate-spin" />
					) : (
						<span
							className={cn(
								"size-1.5 shrink-0 rounded-full bg-muted-foreground/60",
								pr?.reviewDecision === "approved" && "bg-emerald-500",
								pr?.reviewDecision === "changes_requested" && "bg-amber-500",
							)}
						/>
					)}
					<span className="truncate">{statusLabel}</span>
				</output>
			</div>
			{flowState.kind === "error" && !pr ? (
				<Button
					variant="outline"
					size="sm"
					className="h-7 px-2 text-xs"
					onClick={onRetry}
				>
					<Trans>Retry</Trans>
				</Button>
			) : unavailable ? (
				<Button
					variant="outline"
					size="sm"
					className="h-7 gap-1.5 px-2 text-xs"
					disabled
					title={statusLabel}
				>
					<GitPullRequest className="size-3.5" />
					<Trans>Create PR</Trans>
				</Button>
			) : (
				<div className="flex h-7 shrink-0 items-stretch overflow-hidden rounded-md border border-border/60 bg-muted/30 empty:hidden">
					{flowState.kind === "no-pr" ? (
						<ShipControl
							workspaceId={workspaceId}
							sync={flowState.sync}
							onRefresh={onRetry}
							primaryAction="create-pr"
						/>
					) : (
						<PRStatusGroup
							state={flowState}
							workspaceId={workspaceId}
							onRefresh={onRetry}
							isChangesOpen={false}
							toggleLabel={t({ message: "Review" })}
							onToggleChanges={onOpenReview}
							onOpenPullRequest={onOpenPullRequest}
						/>
					)}
				</div>
			)}
			<div className="flex shrink-0 items-center gap-0.5">{toolbar}</div>
		</header>
	);
}
