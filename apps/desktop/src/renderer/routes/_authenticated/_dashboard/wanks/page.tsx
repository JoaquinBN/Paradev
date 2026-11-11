import { Trans } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import { Skeleton } from "@superset/ui/skeleton";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LuVideo } from "react-icons/lu";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { PageHeader } from "renderer/routes/_authenticated/_dashboard/components/PageHeader";
import { useStartWank } from "renderer/routes/_authenticated/_dashboard/hooks/useStartWank";
import { WankCard } from "./components/WankCard";

export const Route = createFileRoute("/_authenticated/_dashboard/wanks/")({
	component: WanksPage,
});

function WanksPage() {
	const navigate = useNavigate();
	const { startWank, isStarting } = useStartWank();
	const { data: automations = [], isPending } =
		cloudTrpc.automation.list.useQuery();

	return (
		<div className="relative flex h-full w-full flex-1 flex-col overflow-hidden">
			<PageHeader />
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-8 pt-4 pb-12">
					<div className="flex items-center justify-between gap-3">
						<h1 className="font-semibold text-xl tracking-tight">
							<Trans>Wanks</Trans>
						</h1>
						<Button size="sm" onClick={startWank} disabled={isStarting}>
							<LuVideo className="size-3.5" />
							<Trans>Have a wank</Trans>
						</Button>
					</div>
					{isPending ? (
						<div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
							{["a", "b", "c"].map((key) => (
								<Skeleton key={key} className="h-32 rounded-xl" />
							))}
						</div>
					) : automations.length === 0 ? (
						<p className="py-16 text-center text-sm text-muted-foreground">
							<Trans>
								No wanks yet. Press Have a wank and show what you want
								automated.
							</Trans>
						</p>
					) : (
						<div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
							{automations.map((automation) => (
								<WankCard
									key={automation.id}
									automation={automation}
									onOpen={() =>
										navigate({
											to: "/wanks/$automationId",
											params: { automationId: automation.id },
										})
									}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
