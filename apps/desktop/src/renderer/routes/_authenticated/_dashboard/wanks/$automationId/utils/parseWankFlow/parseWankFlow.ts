export type WankFlowKind = "trigger" | "step" | "check" | "parallel" | "output";

export interface WankFlowNode {
	kind: WankFlowKind;
	title: string;
	detail?: string;
	tool?: string;
	items?: string[];
}

const KINDS: readonly WankFlowKind[] = [
	"trigger",
	"step",
	"check",
	"parallel",
	"output",
];
const FLOW_COMMENT = /<!--\s*wank-flow\s+([\s\S]*?)\s*-->/;
const STEP_ITEM = /^\s*\d+[.)]\s+(?:\*\*(.+?)\*\*[:.]?\s*)?(.*)$/;

/**
 * The workflow of an automation, from the `wank-flow` comment Wank writes at the end of a prompt.
 * Prompts without one fall back to their numbered `## Steps`, framed by the trigger.
 */
export function parseWankFlow(
	prompt: string,
	triggerTitle: string,
): WankFlowNode[] {
	const embedded = embeddedFlow(prompt);
	if (embedded) return embedded;
	const steps = numberedSteps(prompt).map(
		(step): WankFlowNode => ({ kind: "step", ...step }),
	);
	return [{ kind: "trigger", title: triggerTitle }, ...steps];
}

function embeddedFlow(prompt: string): WankFlowNode[] | null {
	const json = FLOW_COMMENT.exec(prompt)?.[1];
	if (!json) return null;
	try {
		const nodes = (JSON.parse(json) as { nodes?: unknown }).nodes;
		if (!Array.isArray(nodes)) return null;
		const valid = nodes.filter(
			(node): node is WankFlowNode =>
				typeof node?.title === "string" && KINDS.includes(node?.kind),
		);
		return valid.length > 0 ? valid : null;
	} catch {
		return null;
	}
}

function numberedSteps(prompt: string): { title: string; detail?: string }[] {
	const section = /^##\s+Steps\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/m.exec(
		prompt,
	)?.[1];
	if (!section) return [];
	return section.split("\n").flatMap((line) => {
		const match = STEP_ITEM.exec(line);
		if (!match) return [];
		const [, bold, rest] = match;
		const detail = rest?.trim() || undefined;
		return bold
			? [{ title: bold.trim(), detail }]
			: [{ title: detail ?? "" }].filter((step) => step.title);
	});
}
