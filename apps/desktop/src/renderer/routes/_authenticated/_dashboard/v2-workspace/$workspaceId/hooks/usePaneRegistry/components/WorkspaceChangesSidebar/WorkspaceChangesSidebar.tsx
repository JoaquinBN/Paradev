import type { RendererContext, WorkspaceStore } from "@superset/panes";
import { useCallback } from "react";
import type { OpenPullRequestPane } from "renderer/lib/github/openPullRequestLink";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import { FilesTab } from "../../../../components/WorkspaceSidebar/components/FilesTab";
import { useChangesTab } from "../../../../components/WorkspaceSidebar/hooks/useChangesTab";
import { useReviewTab } from "../../../../components/WorkspaceSidebar/hooks/useReviewTab";
import { useWorkspaceGitStatus } from "../../../../providers/WorkspaceGitStatusProvider";
import type {
	CommentPaneData,
	DiffPaneData,
	FilePaneData,
	OpenFile,
	PaneViewerData,
} from "../../../../types";
import { openPullRequestPaneInStore } from "../../../../utils/openPullRequestPaneInStore";
import { useDiffPaneTarget } from "../../../useDiffPaneTarget";
import {
	type OpenReviewDiff,
	useReviewCommentNavigation,
} from "../../../useReviewCommentNavigation";

interface WorkspaceChangesSidebarProps {
	context: RendererContext<PaneViewerData>;
	centerStore: StoreApi<WorkspaceStore<PaneViewerData>>;
	workspaceId: string;
	onOpenDiff: OpenReviewDiff;
	onOpenFile: OpenFile;
	onSearch?: () => void;
	pendingFileReveal?: { path: string; isDirectory: boolean } | null;
}

export function WorkspaceChangesSidebar({
	context,
	centerStore,
	workspaceId,
	onOpenDiff,
	onOpenFile,
	onSearch,
	pendingFileReveal,
}: WorkspaceChangesSidebarProps) {
	const data = context.pane.data as DiffPaneData;
	const selectedDiffTarget = useDiffPaneTarget(centerStore);
	const selectedFilePath = useStore(centerStore, (state) => {
		const pane = state.getActivePane()?.pane;
		return pane?.kind === "file"
			? (pane.data as FilePaneData).filePath
			: undefined;
	});
	const gitStatus = useWorkspaceGitStatus();
	const selectFile = useCallback(
		(path: string, newTab?: boolean, changeKey?: string) => {
			onOpenDiff(path, newTab, undefined, undefined, changeKey, {
				scope: "file",
				paths: [path],
			});
		},
		[onOpenDiff],
	);
	const changes = useChangesTab({
		workspaceId,
		selectedDiffTarget,
		onSelectFile: selectFile,
		onOpenFile,
		flat: true,
	});
	const openPullRequest = useCallback<OpenPullRequestPane>(
		(ref, placement) => openPullRequestPaneInStore(centerStore, ref, placement),
		[centerStore],
	);
	const openComment = useCallback(
		(comment: CommentPaneData) => {
			centerStore
				.getState()
				.addTab({ panes: [{ kind: "comment", data: comment }] });
		},
		[centerStore],
	);
	const openInDiff = useReviewCommentNavigation(workspaceId, onOpenDiff);
	const review = useReviewTab({
		workspaceId,
		onOpenComment: openComment,
		onOpenPullRequest: openPullRequest,
		onOpenInDiff: openInDiff,
	});
	const tab = data.sidebarTab ?? "changes";
	return (
		<div
			data-design-surface="changes-sidebar"
			className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-sidebar"
		>
			{tab === "files" ? (
				<FilesTab
					workspaceId={workspaceId}
					selectedFilePath={selectedFilePath}
					pendingReveal={pendingFileReveal}
					onSelectFile={onOpenFile}
					gitStatus={gitStatus.data}
					onSearch={onSearch}
				/>
			) : tab === "review" ? (
				review.content
			) : (
				changes.content
			)}
		</div>
	);
}
