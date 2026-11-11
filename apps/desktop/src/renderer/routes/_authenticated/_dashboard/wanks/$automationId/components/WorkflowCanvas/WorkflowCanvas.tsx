import { Trans } from "@lingui/react/macro";
import { cn } from "@superset/ui/utils";
import { Fragment, type ReactNode, useState } from "react";
import type { IconType } from "react-icons";
import {
	LuArrowRight,
	LuGitBranch,
	LuInbox,
	LuLayers,
	LuSettings2,
	LuZap,
} from "react-icons/lu";
import type { WankFlowKind, WankFlowNode } from "../../utils/parseWankFlow";

const KIND_STYLE: Record<
	WankFlowKind,
	{ icon: IconType; tint: string; label: ReactNode }
> = {
	trigger: {
		icon: LuZap,
		tint: "bg-orange-500",
		label: <Trans>Trigger</Trans>,
	},
	step: { icon: LuSettings2, tint: "bg-blue-500", label: <Trans>Step</Trans> },
	check: {
		icon: LuGitBranch,
		tint: "bg-amber-500",
		label: <Trans>Check</Trans>,
	},
	parallel: {
		icon: LuLayers,
		tint: "bg-purple-500",
		label: <Trans>In parallel</Trans>,
	},
	output: { icon: LuInbox, tint: "bg-green-500", label: <Trans>Output</Trans> },
};

interface WorkflowCanvasProps {
	nodes: WankFlowNode[];
}

export function WorkflowCanvas({ nodes }: WorkflowCanvasProps) {
	const [selected, setSelected] = useState<number | null>(null);
	const selectedNode = selected === null ? null : nodes[selected];

	return (
		<div className="flex flex-col gap-4">
			<div className="overflow-x-auto rounded-xl border bg-[radial-gradient(circle,var(--color-border)_1px,transparent_1px)] [background-size:18px_18px]">
				<div className="flex w-max items-center px-6 py-10">
					{nodes.map((node, index) => {
						const style = KIND_STYLE[node.kind];
						const Icon = style.icon;
						return (
							// biome-ignore lint/suspicious/noArrayIndexKey: nodes are a fixed ordered list
							<Fragment key={index}>
								{index > 0 && (
									<LuArrowRight className="mx-2 size-4 shrink-0 text-muted-foreground" />
								)}
								<button
									type="button"
									onClick={() => setSelected(selected === index ? null : index)}
									className={cn(
										"flex w-52 flex-col gap-2 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:border-foreground/30",
										selected === index && "border-foreground/50",
									)}
								>
									<span className="flex items-center gap-2">
										<span
											className={cn(
												"flex size-7 items-center justify-center rounded-md text-white",
												style.tint,
											)}
										>
											<Icon className="size-3.5" />
										</span>
										<span className="text-xs text-muted-foreground">
											{style.label}
										</span>
										{node.tool && (
											<span className="ml-auto truncate rounded-full bg-muted px-2 py-0.5 text-[10px]">
												{node.tool}
											</span>
										)}
									</span>
									<span className="line-clamp-2 text-sm font-medium">
										{node.title}
									</span>
									{node.items ? (
										<span className="flex flex-col gap-1">
											{node.items.map((item) => (
												<span
													key={item}
													className="truncate rounded-md bg-muted px-2 py-1 text-xs"
												>
													{item}
												</span>
											))}
										</span>
									) : (
										node.detail && (
											<span className="line-clamp-3 text-xs text-muted-foreground">
												{node.detail}
											</span>
										)
									)}
								</button>
							</Fragment>
						);
					})}
				</div>
			</div>
			{selectedNode?.detail && (
				<div className="rounded-xl border bg-card p-4 text-sm">
					<p className="font-medium">{selectedNode.title}</p>
					<p className="mt-1 text-muted-foreground">{selectedNode.detail}</p>
				</div>
			)}
		</div>
	);
}
