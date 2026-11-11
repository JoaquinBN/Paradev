import { Trans, useLingui } from "@lingui/react/macro";
import { Workspace, type WorkspaceProps } from "@superset/panes";
import { Button } from "@superset/ui/button";
import { ChevronDown, ChevronUp, Plus, Terminal } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import {
	type ImperativePanelHandle,
	Panel,
	PanelGroup,
	PanelResizeHandle,
} from "react-resizable-panels";
import { reportRendererError } from "renderer/lib/report-renderer-error";
import type { PaneViewerData } from "../../types";

interface WorkspaceSidePanelProps {
	children: ReactNode;
	terminal: Pick<
		WorkspaceProps<PaneViewerData>,
		| "store"
		| "registry"
		| "paneActions"
		| "contextMenuActions"
		| "onBeforeCloseTab"
		| "isFocused"
	>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onNewTerminal: () => void;
	onResizingChange: (dragging: boolean) => void;
}

export function WorkspaceSidePanel({
	children,
	terminal,
	open,
	onOpenChange,
	onNewTerminal,
	onResizingChange,
}: WorkspaceSidePanelProps) {
	const { t } = useLingui();
	const panelRef = useRef<ImperativePanelHandle>(null);
	useEffect(() => {
		if (open) panelRef.current?.expand();
		else panelRef.current?.collapse();
	}, [open]);
	const registry = useMemo(
		() => ({
			...terminal.registry,
			terminal: {
				...terminal.registry.terminal,
				renderHeaderExtras: (
					ctx: Parameters<
						NonNullable<typeof terminal.registry.terminal.renderHeaderExtras>
					>[0],
				) => (
					<>
						{terminal.registry.terminal.renderHeaderExtras?.(ctx)}
						<Button
							variant="ghost"
							size="icon"
							className="size-6"
							onClick={onNewTerminal}
							aria-label={t({ message: "New terminal" })}
							title={t({ message: "New terminal" })}
						>
							<Plus className="size-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="size-6"
							onClick={() => onOpenChange(false)}
							aria-label={t({ message: "Collapse" })}
							title={t({ message: "Collapse" })}
						>
							<ChevronDown className="size-3.5" />
						</Button>
					</>
				),
			},
		}),
		[terminal.registry, onNewTerminal, onOpenChange, t],
	);
	return (
		<div
			className="flex h-full min-h-0 min-w-0 flex-col"
			data-design-surface="workspace-side-panel"
		>
			<PanelGroup direction="vertical" className="min-h-0 flex-1">
				<Panel id="workspace-tools" order={1} defaultSize={65} minSize={25}>
					<div className="flex h-full min-h-0 flex-col">{children}</div>
				</Panel>
				<PanelResizeHandle
					className={
						open
							? "h-1 shrink-0 bg-border/60 transition-colors hover:bg-ring focus-visible:bg-ring"
							: "hidden"
					}
					onDragging={onResizingChange}
					aria-label={t({ message: "Terminal" })}
				/>
				<Panel
					ref={panelRef}
					id="workspace-terminal"
					order={2}
					defaultSize={35}
					minSize={15}
					collapsible
					collapsedSize={0}
					onCollapse={() => onOpenChange(false)}
					onExpand={() => onOpenChange(true)}
				>
					<section
						className="h-full min-h-0 min-w-0"
						data-pane-area="terminal"
						data-design-surface="terminal-dock"
						aria-label={t({ message: "Terminal" })}
						inert={!open}
					>
						<Workspace
							allowSplits={false}
							{...terminal}
							registry={registry}
							renderTabBar={() => null}
							onPaneError={reportRendererError}
							renderEmptyState={() => (
								<div className="flex h-full items-center justify-center">
									<Button variant="ghost" onClick={onNewTerminal}>
										<Plus className="size-4" />
										<Trans>New terminal</Trans>
									</Button>
								</div>
							)}
						/>
					</section>
				</Panel>
			</PanelGroup>
			{!open && (
				<Button
					variant="ghost"
					className="h-9 w-full shrink-0 justify-start gap-2 rounded-none border-t px-3 text-xs text-muted-foreground"
					onClick={() => onOpenChange(true)}
					aria-label={t({ message: "Open Terminal" })}
				>
					<Terminal className="size-3.5" />
					<Trans>Terminal</Trans>
					<ChevronUp className="ml-auto size-3.5" />
				</Button>
			)}
		</div>
	);
}
