import type { NodeHandlerArgs, NodeHandlerResult } from "../types";
import {
	evaluateCondition,
	resolveValue,
	successors,
} from "../lib/template";

export async function handleIf(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const cfg = args.node.data.config;
	const cases = Array.isArray(cfg.cases)
		? (cfg.cases as Array<{ handle: string; expression: string }>)
		: [
				{
					handle: "true",
					expression: String(cfg.condition ?? cfg.expression ?? ""),
				},
			];

	for (const c of cases) {
		if (evaluateCondition(c.expression, args.context)) {
			const next = successors(args.edges, args.node.id, c.handle);
			return { kind: "success", output: { matched: c.handle }, next };
		}
	}

	const elseNext = successors(args.edges, args.node.id, "else");
	const fallback =
		elseNext.length > 0
			? elseNext
			: successors(args.edges, args.node.id, "false");
	return { kind: "success", output: { matched: "else" }, next: fallback };
}

export async function handleLoop(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const cfg = args.node.data.config;
	const maxIterations = Math.min(Number(cfg.maxIterations ?? 100), 500);
	const mode = String(cfg.mode ?? "forEach");

	let items: unknown[] = [];
	if (mode === "count") {
		const count = Math.min(
			Number(resolveValue(cfg.count ?? 0, args.context)),
			maxIterations,
		);
		items = Array.from({ length: Math.max(0, count) }, (_, i) => i);
	} else {
		const raw = resolveValue(cfg.items ?? cfg.itemsPath, args.context);
		if (typeof cfg.itemsPath === "string" && !Array.isArray(raw)) {
			const fromPath = resolveValue(
				`{{${cfg.itemsPath}}}`,
				args.context,
			);
			items = Array.isArray(fromPath) ? fromPath : [];
		} else {
			items = Array.isArray(raw) ? raw : [];
		}
		items = items.slice(0, maxIterations);
	}

	const bodyTargets = successors(args.edges, args.node.id, "body");
	const exitTargets = successors(args.edges, args.node.id, "exit");
	const defaultNext = successors(args.edges, args.node.id);

	const bodyEntryId = bodyTargets[0] ?? defaultNext[0];
	const exitTargetId =
		exitTargets[0] ?? (bodyTargets.length ? defaultNext.find((id) => id !== bodyEntryId) : defaultNext[0]);

	if (!items.length || !bodyEntryId) {
		return {
			kind: "success",
			output: { iterations: 0, results: [] },
			next: exitTargetId ? [exitTargetId] : [],
		};
	}

	// Seed first iteration via context.loop; runner manages stack via cursor
	args.context.loop = { index: 0, item: items[0], items };
	return {
		kind: "success",
		output: {
			_loop: {
				items,
				index: 0,
				bodyEntryId,
				exitTargetId: exitTargetId ?? null,
			},
			index: 0,
			item: items[0],
			iterations: items.length,
		},
		next: [bodyEntryId],
	};
}

export async function handleCodeJs(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const code = String(args.node.data.config.code ?? "");
	if (!code.trim()) throw new Error("Code node requires code");

	const context = {
		env: args.context.env,
		trigger: args.context.trigger,
		nodes: args.context.nodes,
		loop: args.context.loop,
	};

	// Restricted Function sandbox (no require/process). Prefer isolated-vm in production.
	const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
		...args: string[]
	) => (...fnArgs: unknown[]) => Promise<unknown>;

	const fn = new AsyncFunction(
		"context",
		`"use strict";\n${code}\n`,
	);

	const timeoutMs = Math.min(Number(args.node.data.config.timeoutMs ?? 5000), 15_000);
	const result = await Promise.race([
		fn(context),
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error("Code node timed out")), timeoutMs),
		),
	]);

	const output =
		result && typeof result === "object"
			? (result as Record<string, unknown>)
			: { result };
	return { kind: "success", output };
}
