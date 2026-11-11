# Desktop design

Conductor-inspired presentation for this fork. The application remains Paradev:
its workspace model, agents, ports, Git operations, permissions, and account flows
keep their existing implementations. This fork changes pane placement and navigation.

## Design direction

Use quiet warm surfaces, readable secondary text, thin separators, and compact
controls. Give the active task more emphasis than chrome. Use the existing theme
colors and font preferences, including light and custom themes. Keep status,
error, diff, and terminal ANSI colors meaningful.

- Home, Create, and Search lead the sidebar. My workspaces and custom sections
  contain projects, which contain workspaces. Project-free workspaces appear
  under No project; chats remain inside workspaces. Secondary navigation stays
  in a keyboard-accessible Tools disclosure.
- Section menus create, rename, and remove sections. Workspace menus and dragging
  move workspaces between sections; project menus retain import, settings, hide,
  and delete. Create puts project, checkout, section, and host choices above the
  prompt and carries the section when opened from a project's plus button.
- The workspace header names the checkout and emphasizes New Chat. The main tab
  bar’s + opens a chat directly. Terminal and
  Terminal Scripts have compact launchers; Files and Changes stay in the side panel.
  The scripts menu retains agent presets, custom commands, ordering, and settings.
- The terminal has its own resizable, collapsible dock below the right-hand tools.
  It stays mounted while Files, Changes, Review, or other tools switch. Terminal
  sessions use a dropdown instead of competing with conversations in the main tabs.
  Agent and model selection stays in the message composer; the chat/CLI handoff
  is in the chat's More options menu.
- The main header stays inside the conversation column. The right column has a
  full-height divider and its own persistent PR/status header, above Files,
  Changes, and Review. Create PR uses the existing commit and PR forms; dirty
  work first shows the commit step, and only the final PR submission publishes.
  Project-free workspaces retain their existing commit/push actions. Linked PRs
  retain checks, review status, merge actions, and the PR summary opener.
- Changes combines file totals, search, and view controls in one row. Compare
  changes exposes the existing commit filter and base selector. Staged and
  unstaged groups remain distinct. A Tools menu retains other saved panes, New
  Tab, Open Diff, and Expand; saved tools keep their tab and close controls.
  Workspace activity opens from this sidebar without covering the conversation.
- Changes keeps its file list above the terminal.
  Selecting a changed file opens a named diff tab in the main area; selecting
  another reuses that diff unless the user requests a new tab. Open Diff shows
  the complete changeset. The list keeps its staging, discard, search, scope,
  tree-view, and context-menu actions.
- File views and turn-specific diffs also open in the main area, alongside chat.
  Reveal in Files selects and expands the right-hand tree. Narrow diff panes use
  a unified diff below 640 px; wider panes use the saved diff preference.
- Sessions have a wider reading column, distinct user messages, quieter expandable
  tool groups with call counts, visible reply metadata, and a useful empty state.
  Streaming, approvals, cancellation, file actions, and transcript loading stay in
  their existing components.
- Sidebar and title bar share the sidebar surface. Content stays on the main surface.
- Page headers use an inset separator that does not change their measured height.
- Records keep their upstream container breakpoints and use fluid horizontal padding.
- Menus and dialogs share a restrained shadow and border. Dialogs fit short windows.
- Settings sections separate related controls and wrap their action row when needed.
- Account usage sits in the top-right corner of the composer, with its own space
  beside the draft. Agent and model controls remain in the composer footer.
- The composer gains a clear keyboard-focus boundary without changing its editor,
  attachments, submit/stop controls, or layout modes.
- Control transitions last 140 ms and name their properties. Geometry, terminal
  scrolling, pane resizing, and drag transforms are not animated by this layer.
- Reduced-motion mode removes these transitions and popup animations.

The reference is the installed Conductor workspace observed on 2026-11-09:
project/workspace navigation on the left, chat and diffs in the center, file lists
and terminal on the right, warm dark surfaces, subdued chrome, and a bordered composer.
REA 6.8.0 inspected the installed app using `inspect-desktop-application` and
`inspect-artifact`. Those inspections establish the bundle inventory, not its
rendered CSS or animation timings. Visual observations informed this independent
implementation; Conductor code and assets are not included.

## Integration boundary

`index.html` enables `data-desktop-design="conductor"`; `globals.css` imports
`conductor.css`. Every selector is scoped to that desktop root, including portals.
Removing the root attribute disables the CSS styling. Structural presentation
changes remain: revert the design commits to restore the complete upstream UI.

Existing `data-slot` attributes cover shared controls in all desktop features.
`data-design-surface` attributes mark the few application-specific surfaces. Their
source files are inventoried in `scripts/desktop-design/check.ts`. Presentation changes also live in the existing sidebar, transcript, and review
components. `WorkspaceFocusHeader` wires existing navigation actions;
`WorkspaceChangesSidebar` composes the existing file, changes, and PR review
views. `WorkspaceReviewHeader` composes the existing PR flow, ship forms, and
PR status control; it adds no Git mutations or backend procedures.
`WorkspaceSidePanel` renders the terminal through the existing pane registry.
`openTerminalDock` creates or focuses a shell. `WorkspaceTerminalEffects` transfers
terminal panes through the pane library's move APIs, preserving pane/session IDs
and session contents. It moves chat interfaces back to the center. File and diff
openers use the same store APIs to open main-area tabs. Their default placement
stays unchanged for other callers.
The three workspace areas opt into `allowSplits={false}` on `Workspace`. Split
buttons, menu actions, and shortcuts are removed. Pane drop targets reject split
gestures. Saved layouts and programmatic splits become separate tabs through the
existing move API, preserving pane objects, session IDs, and the focused tab. The
shared pane library defaults to allowing splits for other consumers. The terminal
dock, sidebar resizing, and diff comparison layout remain independently resizable.
The optional `terminalPaneLayout` field lives in the existing workspace local-state
row, with the same persistence and deletion lifecycle as the other pane layouts.
No new localStorage key or backend procedure is added. Archive cleanup, runtime
tracking, notifications, agent focus, and keyboard shortcuts include the dock.

`DashboardSidebarWorkspaceSections` projects existing tag folders into top-level
sections. Equal normalized tags share a heading across projects; each workspace
keeps its original project and host. The existing folder mutations own membership,
names, collapse state, and removal. Legacy folders remain distinct until the
existing tag migration converts them. Removing a section ungroups its workspaces.
`useNavigationSections` derives this view without another persistence store.
The creation draft's section tag is temporary and resets with the draft. Host
creation uses its existing tags input; cloud creation uses its existing personal
tags operation. No workspace, branch, chat, or project identity is converted.
Upstream merges still require review and UI verification; the compatibility check
detects missing integration points but cannot guarantee conflict-free merges.
CLI pane operations still expose their existing main/sidebar contract: the dock
is included in sidebar listings and operations. Terminal placement follows this
fork's dock layout. Disabling the right-pane feature restores dock tabs to the
main area. When reverting this structural change, first move saved dock tabs
back through the existing pane transfer APIs so older builds can see them.

Avoid class-name substring selectors,
DOM-position selectors, runtime DOM rewriting, global element rules, or duplicated
upstream components. Do not override user theme colors or code font metrics.

A new feature using the existing primitives inherits their styling. A new primitive
or layout still needs design review and an explicit surface when appropriate. Keep
structural changes in the upstream component instead of making CSS change focus
order, hide actions, reorder panes, or bypass feature flags.

## Updating the fork

Run `bun scripts/desktop-design/check.ts` and `bun test scripts/desktop-design`.
They detect removed imports, missing surface hooks, and renamed primitive slots.
They do not prove layout correctness or backend compatibility.

`.github/workflows/desktop-design.yml` runs those checks on PRs and main pushes.
Once on the fork's default branch with Actions enabled, it checks upstream daily
at 07:23 UTC or on manual dispatch. It prepares a fresh update branch, checks the
merged contracts and types, and opens a PR. It never force-pushes or merges to main.
A textual conflict or failed check stops the update and leaves diagnostics in the
Actions run. Opening PRs requires the repository's Actions PR-creation setting.
No external agent credentials or paid inference service are required.

The automation carries the presentation layer forward; it does not ask an AI to guess how
to resolve behavioral conflicts. For a failed update, inspect the upstream change,
move only the necessary surface hooks, update the contract inventory, and follow
the same design rules. Keep other changes separate. A clean merge is not a UX test.

Before merging an update, follow `.agents/skills/cdp-verification/SKILL.md` against
the actual worktree. Check new workspace, session composer, workspace selection,
terminal input/resize, editor/diff, task/PR/page lists, command palette, menus,
settings, narrow windows, keyboard focus, light/dark themes, and reduced motion.
Save screenshots under `.context/`. Compare changed screens to the approved
baseline; report unavailable features instead of claiming complete coverage.
