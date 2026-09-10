import {
	getWorkflowRunById,
	resumeWorkflowWait,
	updateWorkflowRun,
} from "@repo/database";
import type { WorkflowCursor, WorkflowRuntimeContext } from "../types";
import { parseGraph, successors } from "./template";

function asCursor(raw: unknown): WorkflowCursor {
	if (raw && typeof raw === "object") {
		const c = raw as WorkflowCursor;
		return {
			frontier: Array.isArray(c.frontier) ? c.frontier : [],
			completed: Array.isArray(c.completed) ? c.completed : [],
			loops: Array.isArray(c.loops) ? c.loops : [],
		};
	}
	return { frontier: [], completed: [] };
}

function asContext(raw: unknown): WorkflowRuntimeContext {
	if (raw && typeof raw === "object") {
		const c = raw as WorkflowRuntimeContext;
		return {
			env: c.env ?? {},
			trigger: c.trigger ?? {},
			nodes: c.nodes ?? {},
			loop: c.loop,
		};
	}
	return { env: {}, trigger: {}, nodes: {} };
}

/**
 * Resume a wait, merge node outputs, and enqueue successor nodes.
 */
export async function continueAfterWait(params: {
	waitId: string;
	runId: string;
	nodeId: string;
	resumePayload: unknown;
}) {
	await resumeWorkflowWait(params.waitId, params.resumePayload);
	const run = await getWorkflowRunById(params.runId);
	if (!run?.workflowVersion) return;

	const output =
		params.resumePayload &&
		typeof params.resumePayload === "object" &&
		!Array.isArray(params.resumePayload)
			? (params.resumePayload as Record<string, unknown>)
			: { result: params.resumePayload };

	const context = asContext(run.context);
	const merged: WorkflowRuntimeContext = {
		...context,
		nodes: {
			...context.nodes,
			[params.nodeId]: {
				...(context.nodes[params.nodeId] ?? {}),
				...output,
			},
		},
	};
	const cursor = asCursor(run.cursor);
	const { edges } = parseGraph(
		run.workflowVersion.nodes,
		run.workflowVersion.edges,
	);
	const next = successors(edges, params.nodeId);
	await updateWorkflowRun(run.id, {
		context: merged,
		cursor: {
			...cursor,
			frontier: [...next, ...cursor.frontier],
			completed: cursor.completed.includes(params.nodeId)
				? cursor.completed
				: [...cursor.completed, params.nodeId],
		},
		status: "PENDING",
		claimedAt: null,
		claimToken: null,
	});
}
