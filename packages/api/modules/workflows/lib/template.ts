import type {
	WorkflowGraphEdge,
	WorkflowGraphNode,
	WorkflowNodeType,
	WorkflowRuntimeContext,
} from "../types";

const TEMPLATE_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

function getPath(obj: unknown, path: string): unknown {
	const parts = path.split(".").filter(Boolean);
	let cur: unknown = obj;
	for (const part of parts) {
		if (cur == null || typeof cur !== "object") return undefined;
		cur = (cur as Record<string, unknown>)[part];
	}
	return cur;
}

/** Resolve `{{env.FOO}}` / `{{nodes.http_1.body}}` / `{{trigger.x}}` / `{{loop.item}}` */
export function resolveTemplate(
	template: string,
	context: WorkflowRuntimeContext,
): string {
	return template.replace(TEMPLATE_RE, (_match, expr: string) => {
		const value = getPath(context, expr.trim());
		if (value === undefined || value === null) return "";
		if (typeof value === "string") return value;
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	});
}

export function resolveValue(
	value: unknown,
	context: WorkflowRuntimeContext,
): unknown {
	if (typeof value === "string") {
		if (value.match(/^\{\{\s*[^}]+\s*\}\}$/)) {
			const expr = value.replace(/^\{\{\s*|\s*\}\}$/g, "").trim();
			return getPath(context, expr);
		}
		if (value.includes("{{")) return resolveTemplate(value, context);
		return value;
	}
	if (Array.isArray(value)) {
		return value.map((v) => resolveValue(v, context));
	}
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = resolveValue(v, context);
		}
		return out;
	}
	return value;
}

export function evaluateCondition(
	expression: string,
	context: WorkflowRuntimeContext,
): boolean {
	const trimmed = expression.trim();
	if (!trimmed) return false;

	// Simple comparisons: {{path}} op value
	const cmp = trimmed.match(
		/^(.+?)\s*(==|!=|>=|<=|>|<|contains|exists)\s*(.*)$/i,
	);
	if (cmp) {
		const leftRaw = cmp[1].trim();
		const op = cmp[2].toLowerCase();
		const rightRaw = cmp[3].trim();
		const left = leftRaw.includes("{{")
			? resolveValue(leftRaw, context)
			: getPath(context, leftRaw.replace(/^\{\{|\}\}$/g, "").trim());
		if (op === "exists")
			return left !== undefined && left !== null && left !== "";
		let right: unknown = rightRaw;
		if (
			(rightRaw.startsWith('"') && rightRaw.endsWith('"')) ||
			(rightRaw.startsWith("'") && rightRaw.endsWith("'"))
		) {
			right = rightRaw.slice(1, -1);
		} else if (rightRaw === "true") right = true;
		else if (rightRaw === "false") right = false;
		else if (rightRaw === "null") right = null;
		else if (!Number.isNaN(Number(rightRaw)) && rightRaw !== "") {
			right = Number(rightRaw);
		} else if (rightRaw.includes("{{") || rightRaw.includes(".")) {
			right = resolveValue(
				rightRaw.includes("{{") ? rightRaw : `{{${rightRaw}}}`,
				context,
			);
		}
		switch (op) {
			case "==":
				// biome-ignore lint/suspicious/noDoubleEquals: template DSL uses loose equality
				return left == right;
			case "!=":
				// biome-ignore lint/suspicious/noDoubleEquals: template DSL uses loose equality
				return left != right;
			case ">":
				return Number(left) > Number(right);
			case "<":
				return Number(left) < Number(right);
			case ">=":
				return Number(left) >= Number(right);
			case "<=":
				return Number(left) <= Number(right);
			case "contains":
				return String(left ?? "").includes(String(right ?? ""));
			default:
				return false;
		}
	}

	const truthy = resolveValue(
		trimmed.includes("{{") ? trimmed : `{{${trimmed}}}`,
		context,
	);
	return Boolean(truthy);
}

export function envVarsToRecord(envVars: unknown): Record<string, string> {
	if (!Array.isArray(envVars)) {
		if (envVars && typeof envVars === "object") {
			const out: Record<string, string> = {};
			for (const [k, v] of Object.entries(envVars)) {
				out[k] = String(v ?? "");
			}
			return out;
		}
		return {};
	}
	const out: Record<string, string> = {};
	for (const item of envVars) {
		if (
			item &&
			typeof item === "object" &&
			"key" in item &&
			typeof (item as { key: unknown }).key === "string"
		) {
			out[(item as { key: string }).key] = String(
				(item as { value?: unknown }).value ?? "",
			);
		}
	}
	return out;
}

export function parseGraph(
	nodesJson: unknown,
	edgesJson: unknown,
): {
	nodes: WorkflowGraphNode[];
	edges: WorkflowGraphEdge[];
} {
	const nodes = (
		Array.isArray(nodesJson) ? nodesJson : []
	) as WorkflowGraphNode[];
	const edges = (
		Array.isArray(edgesJson) ? edgesJson : []
	) as WorkflowGraphEdge[];
	return { nodes, edges };
}

export function getNodeType(node: WorkflowGraphNode): WorkflowNodeType {
	const t = node.data?.type ?? (node.type as WorkflowNodeType);
	return t;
}

export function findStartNodes(
	nodes: WorkflowGraphNode[],
): WorkflowGraphNode[] {
	return nodes.filter((n) => {
		const t = getNodeType(n);
		return t === "start.webhook" || t === "start.scheduled";
	});
}

export function outgoing(
	edges: WorkflowGraphEdge[],
	nodeId: string,
	handle?: string | null,
): WorkflowGraphEdge[] {
	return edges.filter((e) => {
		if (e.source !== nodeId) return false;
		if (handle == null || handle === "") return true;
		return (e.sourceHandle ?? "default") === handle;
	});
}

export function successors(
	edges: WorkflowGraphEdge[],
	nodeId: string,
	handle?: string | null,
): string[] {
	return outgoing(edges, nodeId, handle).map((e) => e.target);
}

export function buildInitialContext(params: {
	env: Record<string, string>;
	trigger: Record<string, unknown>;
}): WorkflowRuntimeContext {
	return {
		env: params.env,
		trigger: params.trigger,
		nodes: {},
	};
}
