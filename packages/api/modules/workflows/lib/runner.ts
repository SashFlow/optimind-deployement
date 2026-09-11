import {
	claimRunnableWorkflowRuns,
	createWorkflowStep,
	createWorkflowWait,
	getAgentSessionById,
	getLatestWorkflowStep,
	getWorkflowRunById,
	listDueWorkflowWaits,
	updateWorkflowRun,
	updateWorkflowStep,
} from "@repo/database";
import { logger } from "@repo/logs";
import type {
	WorkflowCursor,
	WorkflowGraphEdge,
	WorkflowGraphNode,
	WorkflowRuntimeContext,
} from "../types";
import { continueAfterWait } from "./continue-wait";
import {
	buildInitialContext,
	findStartNodes,
	getNodeType,
	parseGraph,
	successors,
} from "./template";
import { executeNode, finalizeHumanApprovalWait } from "../nodes";

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

function mergeNodeOutput(
	context: WorkflowRuntimeContext,
	nodeId: string,
	output: Record<string, unknown>,
): WorkflowRuntimeContext {
	return {
		...context,
		nodes: {
			...context.nodes,
			[nodeId]: {
				...(context.nodes[nodeId] ?? {}),
				...output,
			},
		},
	};
}

function initialFrontier(
	nodes: WorkflowGraphNode[],
	triggerType: string,
): string[] {
	const starts = findStartNodes(nodes);
	if (!starts.length) return [];
	if (triggerType === "SCHEDULE" || triggerType === "schedule") {
		const scheduled = starts.find(
			(n) => getNodeType(n) === "start.scheduled",
		);
		if (scheduled) return [scheduled.id];
	}
	if (triggerType === "WEBHOOK" || triggerType === "webhook") {
		const webhook = starts.find((n) => getNodeType(n) === "start.webhook");
		if (webhook) return [webhook.id];
	}
	const webhook = starts.find((n) => getNodeType(n) === "start.webhook");
	return [(webhook ?? starts[0]).id];
}

async function advanceLoopAfterNode(
	context: WorkflowRuntimeContext,
	cursor: WorkflowCursor,
	completedNodeId: string,
	edges: WorkflowGraphEdge[],
): Promise<{
	context: WorkflowRuntimeContext;
	cursor: WorkflowCursor;
	next?: string[];
} | null> {
	const loops = [...(cursor.loops ?? [])];
	if (!loops.length) return null;

	const frame = loops[loops.length - 1];
	if (!frame) return null;

	const backEdges = edges.filter(
		(e) => e.source === completedNodeId && e.target === frame.nodeId,
	);
	const bodyExhausted =
		backEdges.length > 0 ||
		(frame.bodyEntryId === completedNodeId &&
			successors(edges, completedNodeId).length === 0);

	if (!bodyExhausted && !backEdges.length) {
		return null;
	}

	const nextIndex = frame.index + 1;
	if (nextIndex < frame.items.length && frame.bodyEntryId) {
		frame.index = nextIndex;
		return {
			context: {
				...context,
				loop: {
					index: nextIndex,
					item: frame.items[nextIndex],
					items: frame.items,
				},
			},
			cursor: { ...cursor, loops: [...loops.slice(0, -1), frame] },
			next: [frame.bodyEntryId],
		};
	}

	const exitId = frame.exitTargetId;
	const { loop: _removed, ...rest } = context;
	return {
		context: rest,
		cursor: { ...cursor, loops: loops.slice(0, -1) },
		next: exitId ? [exitId] : [],
	};
}

export async function processWorkflowRun(runId: string) {
	const run = await getWorkflowRunById(runId);
	if (!run || !run.workflowVersion) return;
	if (
		run.status === "SUCCEEDED" ||
		run.status === "FAILED" ||
		run.status === "CANCELLED"
	) {
		return;
	}

	const { nodes, edges } = parseGraph(
		run.workflowVersion.nodes,
		run.workflowVersion.edges,
	);
	let context = asContext(run.context);
	let cursor = asCursor(run.cursor);

	if (!cursor.frontier.length && !cursor.completed.length) {
		cursor.frontier = initialFrontier(nodes, run.triggerType);
		context = buildInitialContext({
			env:
				run.envSnapshot && typeof run.envSnapshot === "object"
					? (run.envSnapshot as Record<string, string>)
					: {},
			trigger: (run.triggerPayload as Record<string, unknown>) ?? {},
		});
	}

	const nodeById = new Map(nodes.map((n) => [n.id, n]));
	const maxSteps = 50;

	for (let i = 0; i < maxSteps; i++) {
		const nodeId = cursor.frontier[0];
		if (!nodeId) {
			await updateWorkflowRun(run.id, {
				status: "SUCCEEDED",
				context,
				cursor,
				finishedAt: new Date(),
				claimedAt: null,
				claimToken: null,
			});
			return;
		}

		const node = nodeById.get(nodeId);
		if (!node) {
			await updateWorkflowRun(run.id, {
				status: "FAILED",
				error: `Node ${nodeId} not found in graph`,
				context,
				cursor,
				finishedAt: new Date(),
				claimedAt: null,
				claimToken: null,
			});
			return;
		}

		const latest = await getLatestWorkflowStep(run.id, nodeId);
		const attempt = (latest?.attempt ?? 0) + 1;
		const step = await createWorkflowStep({
			runId: run.id,
			nodeId,
			nodeType: getNodeType(node),
			attempt,
			status: "RUNNING",
			input: {
				contextSnapshot: {
					env: context.env,
					trigger: context.trigger,
					loop: context.loop,
				},
			},
			startedAt: new Date(),
		});

		try {
			const result = await executeNode({
				node,
				context,
				run: {
					id: run.id,
					organizationId: run.organizationId,
					campaignId: run.campaignId,
					workflowId: run.workflowId,
				},
				stepId: step.id,
				edges,
				nodes,
			});

			if (result.kind === "wait") {
				await updateWorkflowStep(step.id, {
					status: "WAITING",
					output: result.output ?? {},
				});
				const wait = await createWorkflowWait({
					runId: run.id,
					stepId: step.id,
					kind: result.wait.waitKind,
					externalId: result.wait.externalId,
					resumeAt: result.wait.resumeAt,
					payload: result.wait.payload ?? {},
				});

				if (result.wait.waitKind === "HUMAN_APPROVAL") {
					const payload = (result.wait.payload ?? {}) as {
						channel?: string;
						message?: string;
						emailTo?: string | null;
						expiresAt?: string;
					};
					const appBaseUrl =
						process.env.NEXT_PUBLIC_APP_URL ??
						process.env.APP_URL ??
						"http://localhost:3000";
					const finalized = await finalizeHumanApprovalWait({
						organizationId: run.organizationId,
						campaignId: run.campaignId,
						runId: run.id,
						stepId: step.id,
						waitId: wait.id,
						channel: payload.channel === "EMAIL" ? "EMAIL" : "WEB",
						message: payload.message ?? "Approval required",
						emailTo: payload.emailTo,
						expiresAt: payload.expiresAt
							? new Date(payload.expiresAt)
							: result.wait.resumeAt,
						appBaseUrl,
					});
					context = mergeNodeOutput(context, nodeId, {
						...(result.output ?? {}),
						approvalToken: finalized.approval.token,
						webUrl: finalized.webUrl,
					});
				} else {
					context = mergeNodeOutput(
						context,
						nodeId,
						result.output ?? {},
					);
				}

				cursor = {
					...cursor,
					frontier: cursor.frontier.slice(1),
				};
				await updateWorkflowRun(run.id, {
					status: "WAITING",
					context,
					cursor,
					claimedAt: null,
					claimToken: null,
				});
				return;
			}

			if (result.kind === "end") {
				context = mergeNodeOutput(context, nodeId, result.output);
				await updateWorkflowStep(step.id, {
					status: "SUCCEEDED",
					output: result.output,
					finishedAt: new Date(),
				});
				cursor = {
					frontier: [],
					completed: [...cursor.completed, nodeId],
					loops: cursor.loops,
				};
				await updateWorkflowRun(run.id, {
					status: "SUCCEEDED",
					context,
					cursor,
					finishedAt: new Date(),
					claimedAt: null,
					claimToken: null,
				});
				return;
			}

			context = mergeNodeOutput(context, nodeId, result.output);
			await updateWorkflowStep(step.id, {
				status: "SUCCEEDED",
				output: result.output,
				finishedAt: new Date(),
			});

			if (
				getNodeType(node) === "control.loop" &&
				result.output._loop &&
				typeof result.output._loop === "object"
			) {
				const loopMeta = result.output._loop as {
					items: unknown[];
					index: number;
					bodyEntryId?: string;
					exitTargetId?: string | null;
				};
				cursor.loops = [
					...(cursor.loops ?? []),
					{
						nodeId: node.id,
						index: loopMeta.index,
						items: loopMeta.items,
						bodyEntryId: loopMeta.bodyEntryId,
						exitTargetId: loopMeta.exitTargetId ?? undefined,
					},
				];
			}

			let nextIds =
				result.next !== undefined && result.next !== null
					? result.next
					: successors(edges, nodeId);

			const loopAdvance = await advanceLoopAfterNode(
				context,
				cursor,
				nodeId,
				edges,
			);
			if (loopAdvance?.next) {
				context = loopAdvance.context;
				cursor = loopAdvance.cursor;
				nextIds = loopAdvance.next;
			}

			cursor = {
				...cursor,
				frontier: [...nextIds, ...cursor.frontier.slice(1)],
				completed: [...cursor.completed, nodeId],
			};

			await updateWorkflowRun(run.id, {
				status: "RUNNING",
				context,
				cursor,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error("Workflow step failed", {
				runId: run.id,
				nodeId,
				message,
			});
			await updateWorkflowStep(step.id, {
				status: "FAILED",
				error: message,
				finishedAt: new Date(),
			});
			await updateWorkflowRun(run.id, {
				status: "FAILED",
				error: message,
				context,
				cursor: {
					...cursor,
					frontier: cursor.frontier.slice(1),
					completed: cursor.completed,
				},
				finishedAt: new Date(),
				claimedAt: null,
				claimToken: null,
			});
			return;
		}
	}

	await updateWorkflowRun(run.id, {
		status: "PENDING",
		context,
		cursor,
		claimedAt: null,
		claimToken: null,
	});
}

export async function tickWorkflowRunner(limit = 5) {
	const claimed = await claimRunnableWorkflowRuns(limit);
	for (const run of claimed) {
		try {
			await processWorkflowRun(run.id);
		} catch (err) {
			logger.error("Workflow run processing error", {
				runId: run.id,
				err,
			});
			await updateWorkflowRun(run.id, {
				status: "FAILED",
				error: err instanceof Error ? err.message : String(err),
				finishedAt: new Date(),
				claimedAt: null,
				claimToken: null,
			});
		}
	}
	return { processed: claimed.length };
}

export async function tickDueWaits() {
	const due = await listDueWorkflowWaits(20);
	let resumed = 0;
	for (const wait of due) {
		if (wait.kind === "HUMAN_APPROVAL") {
			await continueAfterWait({
				waitId: wait.id,
				runId: wait.runId,
				nodeId: wait.step.nodeId,
				resumePayload: {
					decision: "EXPIRED",
					approved: false,
					expired: true,
				},
			});
			resumed++;
		} else if (wait.kind === "SCHEDULE") {
			await continueAfterWait({
				waitId: wait.id,
				runId: wait.runId,
				nodeId: wait.step.nodeId,
				resumePayload: {
					scheduledAt: new Date().toISOString(),
				},
			});
			resumed++;
		}
	}
	return { resumed };
}

export async function resumeAgentSessionWait(sessionId: string) {
	const { findPendingWaitByExternalId } = await import("@repo/database");
	const wait = await findPendingWaitByExternalId("AGENT_SESSION", sessionId);
	if (!wait) return null;

	const session = await getAgentSessionById(sessionId);
	if (!session) return null;

	const terminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(
		session.status,
	);
	if (!terminal) return null;

	const egress = session.egressJobs?.[0];
	const playable =
		egress &&
		typeof egress === "object" &&
		("fileUrl" in egress || "outputUrls" in egress)
			? (egress as { fileUrl?: string | null; outputUrls?: string[] })
			: null;

	const egressLink = playable?.fileUrl ?? playable?.outputUrls?.[0] ?? null;

	const participantDetails = {
		fromNumber: session.fromNumber,
		toNumber: session.toNumber,
		channel: session.channel,
		direction: session.direction,
		externalUserId: session.externalUserId,
		contactMetadata:
			session.metadata &&
			typeof session.metadata === "object" &&
			"contactMetadata" in (session.metadata as object)
				? (session.metadata as { contactMetadata?: unknown })
						.contactMetadata
				: undefined,
		roomName: session.livekitRoomName,
	};

	const sessionReport = {
		status: session.status,
		endReason: session.endReason,
		durationMs: session.durationMs,
		transcript: session.transcript
			? {
					fullText: session.transcript.fullText,
					status: session.transcript.status,
					segments: session.transcript.segments,
				}
			: null,
		usages: session.usages,
		toolCalls: session.toolCalls,
		livekitSessionReport: session.livekitSessionReport,
		error: session.errorMessage
			? { code: session.errorCode, message: session.errorMessage }
			: null,
	};

	const output = {
		sessionId: session.id,
		status: session.status,
		participantDetails,
		sessionReport,
		egressLink,
		error: session.errorMessage ?? null,
	};

	await continueAfterWait({
		waitId: wait.id,
		runId: wait.runId,
		nodeId: wait.step.nodeId,
		resumePayload: output as Record<string, unknown>,
	});

	return output;
}
