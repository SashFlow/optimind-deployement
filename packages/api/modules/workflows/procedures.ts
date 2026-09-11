import { ORPCError } from "@orpc/client";
import {
	cancelWorkflowRun,
	createWorkflowRun,
	decideWorkflowApproval,
	getCampaignById,
	getCampaignWorkflowByCampaignId,
	getCampaignWorkflowByWebhookToken,
	getOrCreateCampaignWorkflow,
	getWorkflowApprovalByToken,
	getWorkflowRunById,
	listWorkflowApprovalsByCampaign,
	listWorkflowRuns,
	listWorkflowVersions,
	publishWorkflowVersion,
	saveWorkflowDraft,
} from "@repo/database";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";
import { envVarsToRecord } from "./lib/template";
import { continueAfterWait } from "./lib/continue-wait";
import {
	processWorkflowRun,
	resumeAgentSessionWait,
	tickDueWaits,
	tickWorkflowRunner,
} from "./lib/runner";
import { tickScheduledWorkflows } from "./lib/schedule";
import { workflowEnvVarSchema } from "./types";

// re-export for internal callers
export { resumeAgentSessionWait, tickWorkflowRunner, tickDueWaits };

async function requireCampaignAccess(campaignId: string, userId: string) {
	const campaign = await getCampaignById(campaignId);
	if (!campaign) throw new ORPCError("NOT_FOUND");
	await requireOrgMembership(campaign.organizationId, userId);
	return campaign;
}

export const getDefinition = protectedProcedure
	.route({
		method: "GET",
		path: "/workflows/by-campaign/{campaignId}",
		tags: ["Workflows"],
		summary: "Get campaign workflow definition",
	})
	.input(z.object({ campaignId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireCampaignAccess(input.campaignId, context.user.id);
		const workflow = await getOrCreateCampaignWorkflow(input.campaignId);
		if (!workflow) throw new ORPCError("NOT_FOUND");
		return { workflow };
	});

export const saveDraft = protectedProcedure
	.route({
		method: "PUT",
		path: "/workflows/by-campaign/{campaignId}/draft",
		tags: ["Workflows"],
		summary: "Save workflow draft graph",
	})
	.input(
		z.object({
			campaignId: z.string(),
			nodes: z.array(z.unknown()).optional(),
			edges: z.array(z.unknown()).optional(),
			viewport: z.record(z.string(), z.unknown()).optional(),
			envVars: z.array(workflowEnvVarSchema).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireCampaignAccess(input.campaignId, context.user.id);
		const workflow = await getOrCreateCampaignWorkflow(input.campaignId);
		if (!workflow) throw new ORPCError("NOT_FOUND");
		const updated = await saveWorkflowDraft(workflow.id, {
			nodes: input.nodes,
			edges: input.edges,
			viewport: input.viewport,
			envVars: input.envVars,
		});
		return { workflow: updated };
	});

export const updateEnvVars = protectedProcedure
	.route({
		method: "PUT",
		path: "/workflows/by-campaign/{campaignId}/env",
		tags: ["Workflows"],
		summary: "Update workflow env variables",
	})
	.input(
		z.object({
			campaignId: z.string(),
			envVars: z.array(workflowEnvVarSchema),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireCampaignAccess(input.campaignId, context.user.id);
		const workflow = await getOrCreateCampaignWorkflow(input.campaignId);
		if (!workflow) throw new ORPCError("NOT_FOUND");
		const updated = await saveWorkflowDraft(workflow.id, {
			envVars: input.envVars,
		});
		return { workflow: updated };
	});

export const publish = protectedProcedure
	.route({
		method: "POST",
		path: "/workflows/by-campaign/{campaignId}/publish",
		tags: ["Workflows"],
		summary: "Publish workflow draft as immutable version",
	})
	.input(
		z.object({
			campaignId: z.string(),
			label: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireCampaignAccess(input.campaignId, context.user.id);
		const workflow = await getOrCreateCampaignWorkflow(input.campaignId);
		if (!workflow) throw new ORPCError("NOT_FOUND");
		const version = await publishWorkflowVersion(workflow.id, input.label);
		const refreshed = await getCampaignWorkflowByCampaignId(
			input.campaignId,
		);
		return { version, workflow: refreshed };
	});

export const listVersions = protectedProcedure
	.route({
		method: "GET",
		path: "/workflows/by-campaign/{campaignId}/versions",
		tags: ["Workflows"],
		summary: "List published workflow versions",
	})
	.input(z.object({ campaignId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireCampaignAccess(input.campaignId, context.user.id);
		const workflow = await getOrCreateCampaignWorkflow(input.campaignId);
		if (!workflow) throw new ORPCError("NOT_FOUND");
		const versions = await listWorkflowVersions(workflow.id);
		return { versions };
	});

export const listRuns = protectedProcedure
	.route({
		method: "GET",
		path: "/workflows/by-campaign/{campaignId}/runs",
		tags: ["Workflows"],
		summary: "List workflow runs",
	})
	.input(
		z.object({
			campaignId: z.string(),
			status: z
				.enum([
					"PENDING",
					"RUNNING",
					"WAITING",
					"SUCCEEDED",
					"FAILED",
					"CANCELLED",
				])
				.optional(),
			limit: z.number().int().min(1).max(100).optional(),
			offset: z.number().int().min(0).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireCampaignAccess(input.campaignId, context.user.id);
		return listWorkflowRuns({
			campaignId: input.campaignId,
			status: input.status,
			limit: input.limit,
			offset: input.offset,
		});
	});

export const getRun = protectedProcedure
	.route({
		method: "GET",
		path: "/workflows/runs/{id}",
		tags: ["Workflows"],
		summary: "Get workflow run with steps",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const run = await getWorkflowRunById(input.id);
		if (!run) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(run.organizationId, context.user.id);
		return { run };
	});

export const cancelRun = protectedProcedure
	.route({
		method: "POST",
		path: "/workflows/runs/{id}/cancel",
		tags: ["Workflows"],
		summary: "Cancel a workflow run",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const run = await getWorkflowRunById(input.id);
		if (!run) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(run.organizationId, context.user.id);
		const cancelled = await cancelWorkflowRun(run.id);
		return { run: cancelled };
	});

export const triggerTestRun = protectedProcedure
	.route({
		method: "POST",
		path: "/workflows/by-campaign/{campaignId}/test-run",
		tags: ["Workflows"],
		summary: "Trigger a manual/test workflow run",
	})
	.input(
		z.object({
			campaignId: z.string(),
			triggerPayload: z.record(z.string(), z.unknown()).optional(),
			useDraft: z.boolean().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const campaign = await requireCampaignAccess(
			input.campaignId,
			context.user.id,
		);
		const workflow = await getOrCreateCampaignWorkflow(input.campaignId);
		if (!workflow) throw new ORPCError("NOT_FOUND");

		let versionId = workflow.publishedVersionId;
		if (input.useDraft || !versionId) {
			const version = await publishWorkflowVersion(
				workflow.id,
				`test-${Date.now()}`,
			);
			versionId = version.id;
		}

		const env = envVarsToRecord(workflow.envVars);
		const run = await createWorkflowRun({
			organizationId: campaign.organizationId,
			campaignId: campaign.id,
			workflowId: workflow.id,
			workflowVersionId: versionId,
			triggerType: "TEST",
			triggerPayload: {
				body: input.triggerPayload ?? {},
				receivedAt: new Date().toISOString(),
				manual: true,
			},
			envSnapshot: env,
			context: {
				env,
				trigger: {
					body: input.triggerPayload ?? {},
					receivedAt: new Date().toISOString(),
				},
				nodes: {},
			},
			status: "PENDING",
		});

		// Process immediately for snappy test UX
		await processWorkflowRun(run.id);
		const refreshed = await getWorkflowRunById(run.id);
		return { run: refreshed ?? run };
	});

export const tickRunner = protectedProcedure
	.route({
		method: "POST",
		path: "/workflows/internal/tick",
		tags: ["Workflows"],
		summary: "Claim and process pending workflow runs",
	})
	.input(
		z
			.object({ limit: z.number().int().min(1).max(20).optional() })
			.optional(),
	)
	.handler(async ({ input, context }) => {
		// Any authenticated user can tick; in production gate to admin/cron secret
		if (!context.user?.id) throw new ORPCError("UNAUTHORIZED");
		const due = await tickDueWaits();
		const scheduled = await tickScheduledWorkflows();
		const result = await tickWorkflowRunner(input?.limit ?? 5);
		return { ...result, ...due, scheduled: scheduled.started };
	});

export const listApprovals = protectedProcedure
	.route({
		method: "GET",
		path: "/workflows/by-campaign/{campaignId}/approvals",
		tags: ["Workflows"],
		summary: "List workflow approvals for a campaign",
	})
	.input(
		z.object({
			campaignId: z.string(),
			decision: z
				.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED"])
				.optional(),
			limit: z.number().int().min(1).max(100).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireCampaignAccess(input.campaignId, context.user.id);
		const approvals = await listWorkflowApprovalsByCampaign({
			campaignId: input.campaignId,
			decision: input.decision,
			limit: input.limit,
		});
		return {
			approvals: approvals.map((a) => ({
				token: a.token,
				decision: a.decision,
				message: a.message,
				channel: a.channel,
				expiresAt: a.expiresAt,
				createdAt: a.createdAt,
				decidedAt: a.decidedAt,
				runId: a.runId,
				runStatus: a.run.status,
				nodeId: a.step.nodeId,
				nodeType: a.step.nodeType,
			})),
		};
	});

export const getApproval = publicProcedure
	.route({
		method: "GET",
		path: "/workflows/approvals/{token}",
		tags: ["Workflows"],
		summary: "Get human approval request",
	})
	.input(z.object({ token: z.string() }))
	.handler(async ({ input }) => {
		const approval = await getWorkflowApprovalByToken(input.token);
		if (!approval) throw new ORPCError("NOT_FOUND");
		return {
			approval: {
				token: approval.token,
				decision: approval.decision,
				message: approval.message,
				channel: approval.channel,
				expiresAt: approval.expiresAt,
				runId: approval.runId,
				campaignId: approval.run.campaignId,
			},
		};
	});

export const decideApproval = publicProcedure
	.route({
		method: "POST",
		path: "/workflows/approvals/{token}/decide",
		tags: ["Workflows"],
		summary: "Approve or reject a workflow wait",
	})
	.input(
		z.object({
			token: z.string(),
			decision: z.enum(["APPROVED", "REJECTED"]),
			decidedBy: z.string().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const approval = await decideWorkflowApproval(
			input.token,
			input.decision,
			input.decidedBy,
		);
		if (!approval) throw new ORPCError("NOT_FOUND");
		await continueAfterWait({
			waitId: approval.waitId,
			runId: approval.runId,
			nodeId: approval.step.nodeId,
			resumePayload: {
				decision: input.decision,
				decidedBy: input.decidedBy ?? null,
				decidedAt: new Date().toISOString(),
				approved: input.decision === "APPROVED",
			},
		});
		await tickWorkflowRunner(3);
		return { approval };
	});

/** Internal helper used by Next.js webhook route */
export async function startWebhookRun(
	token: string,
	payload: {
		body: unknown;
		headers?: Record<string, string>;
		query?: Record<string, string>;
	},
) {
	const workflow = await getCampaignWorkflowByWebhookToken(token);
	if (!workflow?.publishedVersionId) {
		throw new Error("Workflow not published");
	}
	const env = envVarsToRecord(workflow.envVars);
	const trigger = {
		body: payload.body,
		headers: payload.headers ?? {},
		query: payload.query ?? {},
		receivedAt: new Date().toISOString(),
	};
	const run = await createWorkflowRun({
		organizationId: workflow.organizationId,
		campaignId: workflow.campaignId,
		workflowId: workflow.id,
		workflowVersionId: workflow.publishedVersionId,
		triggerType: "WEBHOOK",
		triggerPayload: trigger,
		envSnapshot: env,
		context: { env, trigger, nodes: {} },
		status: "PENDING",
	});
	await processWorkflowRun(run.id);
	return getWorkflowRunById(run.id);
}
