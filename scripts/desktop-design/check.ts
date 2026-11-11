import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const renderer = "apps/desktop/src/renderer";
const dashboard = `${renderer}/routes/_authenticated/_dashboard/components`;
const workspace = `${renderer}/routes/_authenticated/_dashboard/v2-workspace/$workspaceId`;
const chat = `${workspace}/hooks/usePaneRegistry/components/ChatSession`;
const sidebar = `${dashboard}/DashboardSidebar/components`;
const panes = "packages/panes/src/react/components/Workspace/components";

const settings = `${renderer}/routes/_authenticated/settings/components`;

export const surfaces: Record<string, string[]> = {
	titlebar: [
		`${dashboard}/TitleBar/TitleBar.tsx`,
		`${dashboard}/TopBar/TopBar.tsx`,
	],
	"page-header": [`${dashboard}/PageHeader/PageHeader.tsx`],
	"feature-header": [`${dashboard}/FeatureHeader/FeatureHeader.tsx`],
	sidebar: [`${dashboard}/DashboardSidebar/DashboardSidebar.tsx`],
	"record-main": [`${dashboard}/RecordLayout/RecordLayout.tsx`],
	"record-side": [`${dashboard}/RecordLayout/RecordLayout.tsx`],
	"settings-sidebar": [`${settings}/SettingsSidebar/SettingsSidebar.tsx`],
	"settings-section": [`${settings}/SettingsSection/SettingsSection.tsx`],
	"settings-section-header": [
		`${settings}/SettingsSection/SettingsSection.tsx`,
	],
	"sidebar-navigation": [
		`${sidebar}/DashboardSidebarHeader/DashboardSidebarHeader.tsx`,
	],
	"sidebar-tools": [
		`${sidebar}/DashboardSidebarHeader/DashboardSidebarHeader.tsx`,
	],
	"sidebar-project": [
		`${sidebar}/DashboardSidebarProjectSection/components/DashboardSidebarProjectRow/DashboardSidebarProjectRow.tsx`,
	],
	"sidebar-workspace-content": [
		`${sidebar}/DashboardSidebarWorkspaceItem/components/DashboardSidebarExpandedWorkspaceRow/DashboardSidebarExpandedWorkspaceRow.tsx`,
	],
	"workspace-header": [
		`${workspace}/components/WorkspaceFocusHeader/WorkspaceFocusHeader.tsx`,
	],
	"workspace-review-header": [
		`${workspace}/components/RightPaneArea/components/WorkspaceReviewHeader/WorkspaceReviewHeader.tsx`,
	],
	"workspace-shell": [`${workspace}/page.tsx`],
	"workspace-launchers": [
		`${workspace}/components/WorkspaceScriptsMenu/WorkspaceScriptsMenu.tsx`,
	],
	"workspace-tabs": [`${panes}/TabBar/TabBar.tsx`],
	"workspace-tab": [`${panes}/TabBar/components/TabItem/TabItem.tsx`],
	"pane-header": [
		`${panes}/Tab/components/Pane/components/PaneHeader/PaneHeader.tsx`,
	],
	"session-user-message": [
		`${chat}/components/Transcript/components/UserMessageRow/UserMessageRow.tsx`,
	],
	"session-answer": [
		`${chat}/components/Transcript/components/AgentMessageRow/AgentMessageRow.tsx`,
	],
	"session-activity": [
		`${chat}/components/Transcript/components/TurnGroupSection/components/ToolRunRow/ToolRunRow.tsx`,
	],
	"session-files": [
		`${chat}/components/Transcript/components/TurnGroupSection/components/TurnChangesCard/TurnChangesCard.tsx`,
	],
	"session-welcome": [`${chat}/components/SessionWelcome/SessionWelcome.tsx`],
	"review-panel": [
		`${workspace}/hooks/usePaneRegistry/components/DiffPane/DiffPane.tsx`,
	],
	"review-navigation": [
		`${workspace}/components/RightPaneArea/components/RightPaneNavigation/RightPaneNavigation.tsx`,
	],

	"changes-sidebar": [
		`${workspace}/hooks/usePaneRegistry/components/WorkspaceChangesSidebar/WorkspaceChangesSidebar.tsx`,
	],
	"changes-summary": [
		`${workspace}/components/WorkspaceSidebar/hooks/useChangesTab/components/ChangesToolbar/ChangesToolbar.tsx`,
	],
	"changed-file": [
		`${workspace}/components/WorkspaceSidebar/hooks/useChangesTab/components/ChangesFileList/components/FileRow/FileRow.tsx`,
	],
	composer: [
		"packages/chat-ui/src/components/PromptInput/components/ComposerBody/ComposerBody.tsx",
	],
};

const primitives = [
	"switch",
	"checkbox",
	"toggle",
	"accordion",
	"tooltip",
	"button",
	"tabs",
	"dropdown-menu",
	"context-menu",
	"select",
	"command",
	"table",
	"input",
	"textarea",
	"dialog",
	"alert-dialog",
	"popover",
	"card",
];

export function checkDesign(read: (path: string) => string): string[] {
	const errors: string[] = [];
	const safeRead = (path: string) => {
		try {
			return read(path);
		} catch {
			errors.push(`Missing integration file: ${path}`);
			return "";
		}
	};
	const css = safeRead(`${renderer}/design/conductor/conductor.css`);
	if (
		!safeRead(`${renderer}/index.html`).includes(
			'data-desktop-design="conductor"',
		)
	) {
		errors.push("Desktop design is not enabled in index.html");
	}
	if (
		!safeRead(`${renderer}/globals.css`).includes(
			'@import "./design/conductor/conductor.css";',
		)
	) {
		errors.push("Desktop stylesheet no longer imports the design layer");
	}
	const sources = primitives
		.map((name) => safeRead(`packages/ui/src/components/ui/${name}.tsx`))
		.join("\n");
	for (const slot of new Set(
		[...css.matchAll(/\[data-slot="([^"]+)"\]/g)].map((match) => match[1]),
	)) {
		if (!sources.includes(`data-slot="${slot}"`))
			errors.push(`Upstream removed or renamed the ${slot} primitive slot`);
	}
	for (const [surface, paths] of Object.entries(surfaces)) {
		for (const path of paths) {
			if (!safeRead(path).includes(`data-design-surface="${surface}"`))
				errors.push(`Missing ${surface} surface in ${path}`);
		}
		if (!css.includes(`[data-design-surface="${surface}"]`))
			errors.push(`Unused surface contract: ${surface}`);
	}
	for (const [path, component] of [
		[
			`${dashboard}/DashboardSidebar/DashboardSidebar.tsx`,
			"DashboardSidebarWorkspaceSections",
		],
		[
			`${renderer}/routes/_authenticated/components/DashboardNewWorkspaceModal/components/NewWorkspaceScreen/NewWorkspaceScreen.tsx`,
			"WorkspaceSectionPicker",
		],
	]) {
		if (!safeRead(path).includes(`<${component}`))
			errors.push(`Missing ${component} integration in ${path}`);
	}
	if (/!important|transition(?:-property)?\s*:\s*all\b/.test(css))
		errors.push("Design must not force styles or animate every property");
	if (!css.includes("prefers-reduced-motion: reduce"))
		errors.push("Design must respect reduced motion");
	return errors;
}

if (import.meta.main) {
	const root = resolve(import.meta.dir, "../..");
	const errors = checkDesign((path) =>
		readFileSync(resolve(root, path), "utf8"),
	);
	if (errors.length) {
		console.error(errors.join("\n"));
		process.exitCode = 1;
	} else {
		console.log(
			"Desktop design contracts intact: entry point, shared primitives, and feature surfaces.",
		);
	}
}
