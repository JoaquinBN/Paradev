import { Trans, useLingui } from "@lingui/react/macro";
import { errorMessage } from "@superset/i18n/errors";
import { Button } from "@superset/ui/button";
import { Skeleton } from "@superset/ui/skeleton";
import { toast } from "@superset/ui/sonner";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { LuChevronLeft, LuPause, LuPencil, LuPlay } from "react-icons/lu";
import { apiTrpcClient } from "renderer/lib/api-trpc-client";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { PageHeader } from "renderer/routes/_authenticated/_dashboard/components/PageHeader";
import { WorkflowCanvas } from "./components/WorkflowCanvas";
import { parseWankFlow } from "./utils/parseWankFlow";

export const Route = createFileRoute(
	"/_authenticated/_dashboard/wanks/$automationId/",
)({
	component: WankWorkflowPage,
});

function WankWorkflowPage() {
	const { automationId } = Route.useParams();
	const { t } = useLingui();
	const navigate = useNavigate();
	const utils = cloudTrpc.useUtils();
	const { data: automations = [], isPending } =
		cloudTrpc.automation.list.useQuery();
	const promptQuery = cloudTrpc.automation.getPrompt.useQuery({
		id: automationId,
	});
	const automation = automations.find((row) => row.id === automationId);
	const triggerTitle =
		automation?.scheduleText ?? t({ message: "Runs on demand" });
	const nodes = useMemo(
		() => parseWankFlow(promptQuery.data?.prompt ?? "", triggerTitle),
		[promptQuery.data?.prompt, triggerTitle],
	);

	const runNow = useMutation({
		mutationFn: () =>
			apiTrpcClient.automation.runNow.mutate({ id: automationId }),
		onSuccess: () => toast.success(t({ message: "Running now" })),
		onError: (error) =>
			toast.error(errorMessage(error, t({ message: "Failed to trigger run" }))),
	});
	const setEnabled = useMutation({
		mutationFn: (enabled: boolean) =>
			apiTrpcClient.automation.setEnabled.mutate({ id: automationId, enabled }),
		onSuccess: () => void utils.automation.list.invalidate(),
		onError: (error) =>
			toast.error(
				errorMessage(error, t({ message: "Failed to update automation" })),
			),
	});

	return (
		<div className="relative flex h-full w-full flex-1 flex-col overflow-hidden">
			<PageHeader />
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-8 pt-4 pb-12">
					<Link
						to="/wanks"
						className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
					>
						<LuChevronLeft className="size-4" />
						<Trans>Wanks</Trans>
					</Link>
					{isPending || !automation ? (
						<Skeleton className="h-60 rounded-xl" />
					) : (
						<>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="flex flex-col gap-1">
									<h1 className="font-semibold text-xl tracking-tight">
										{automation.name}
									</h1>
									<span className="text-sm text-muted-foreground">
										{triggerTitle}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Button
										size="sm"
										onClick={() => runNow.mutate()}
										disabled={runNow.isPending}
									>
										<LuPlay className="size-3.5" />
										<Trans>Run now</Trans>
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={() => setEnabled.mutate(!automation.enabled)}
										disabled={setEnabled.isPending}
									>
										{automation.enabled ? (
											<>
												<LuPause className="size-3.5" />
												<Trans>Pause</Trans>
											</>
										) : (
											<>
												<LuPlay className="size-3.5" />
												<Trans>Resume</Trans>
											</>
										)}
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={() =>
											navigate({
												to: "/automations/$automationId",
												params: { automationId },
											})
										}
									>
										<LuPencil className="size-3.5" />
										<Trans>Edit</Trans>
									</Button>
								</div>
							</div>
							{promptQuery.isPending ? (
								<Skeleton className="h-48 rounded-xl" />
							) : (
								<WorkflowCanvas nodes={nodes} />
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
