import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import type {
	Prisma,
	WorkflowApprovalChannel,
	WorkflowApprovalDecision,
	WorkflowRunStatus,
	WorkflowStepStatus,
	WorkflowTriggerType,
	WorkflowWaitKind,
	WorkflowWaitStatus,
} from "../generated/client";

export async function getOrCreateCampaignWorkflow(campaignId: string) {
	const existing = await db.campaignWorkflow.findUnique({
		where: { campaignId },
		include: {
			publishedVersion: true,
			campaign: {
				select: { id: true, organizationId: true, name: true },
			},
		},
	});
	if (existing) {
		return existing;
	}

	const campaign = await db.campaign.findUnique({
		where: { id: campaignId },
		select: { id: true, organizationId: true },
	});
	if (!campaign) {
		return null;
	}

	return db.campaignWorkflow.create({
		data: {
			campaignId: campaign.id,
			organizationId: campaign.organizationId,
			draftNodes: [],
			draftEdges: [],
			draftViewport: {},
			envVars: [],
		},
		include: {
			publishedVersion: true,
			campaign: {
				select: { id: true, organizationId: true, name: true },
			},
		},
	});
}

export async function getCampaignWorkflowByCampaignId(campaignId: string) {
	return db.campaignWorkflow.findUnique({
		where: { campaignId },
		include: {
			publishedVersion: true,
			campaign: {
				select: {
					id: true,
					organizationId: true,
					name: true,
					agentId: true,
					status: true,
				},
			},
		},
	});
}

export async function getCampaignWorkflowByWebhookToken(token: string) {
	return db.campaignWorkflow.findUnique({
		where: { webhookToken: token },
		include: {
			publishedVersion: true,
			campaign: true,
		},
	});
}

export async function saveWorkflowDraft(
	workflowId: string,
	data: {
		nodes?: unknown;
		edges?: unknown;
		viewport?: unknown;
		envVars?: unknown;
	},
) {
	return db.campaignWorkflow.update({
		where: { id: workflowId },
		data: {
			...(data.nodes !== undefined
				? { draftNodes: data.nodes as Prisma.InputJsonValue }
				: {}),
			...(data.edges !== undefined
				? { draftEdges: data.edges as Prisma.InputJsonValue }
				: {}),
			...(data.viewport !== undefined
				? { draftViewport: data.viewport as Prisma.InputJsonValue }
				: {}),
			...(data.envVars !== undefined
				? { envVars: data.envVars as Prisma.InputJsonValue }
				: {}),
		},
		include: { publishedVersion: true },
	});
}

export async function publishWorkflowVersion(
	workflowId: string,
	label?: string,
) {
	return db.$transaction(async (tx) => {
		const workflow = await tx.campaignWorkflow.findUniqueOrThrow({
			where: { id: workflowId },
		});
		const last = await tx.campaignWorkflowVersion.findFirst({
			where: { workflowId },
			orderBy: { version: "desc" },
			select: { version: true },
		});
		const version = (last?.version ?? 0) + 1;
		const published = await tx.campaignWorkflowVersion.create({
			data: {
				workflowId,
				version,
				nodes: workflow.draftNodes ?? [],
				edges: workflow.draftEdges ?? [],
				viewport: workflow.draftViewport ?? {},
				label: label ?? `v${version}`,
			},
		});
		await tx.campaignWorkflow.update({
			where: { id: workflowId },
			data: { publishedVersionId: published.id },
		});
		return published;
	});
}

export async function listWorkflowVersions(workflowId: string) {
	return db.campaignWorkflowVersion.findMany({
		where: { workflowId },
		orderBy: { version: "desc" },
	});
}

export async function createWorkflowRun(data: {
	organizationId: string;
	campaignId: string;
	workflowId: string;
	workflowVersionId: string;
	triggerType: WorkflowTriggerType;
	triggerPayload?: unknown;
	envSnapshot?: unknown;
	context?: unknown;
	cursor?: unknown;
	status?: WorkflowRunStatus;
}) {
	return db.workflowRun.create({
		data: {
			organizationId: data.organizationId,
			campaignId: data.campaignId,
			workflowId: data.workflowId,
			workflowVersionId: data.workflowVersionId,
			triggerType: data.triggerType,
			triggerPayload: (data.triggerPayload ??
				{}) as Prisma.InputJsonValue,
			envSnapshot: (data.envSnapshot ?? {}) as Prisma.InputJsonValue,
			context: (data.context ?? {}) as Prisma.InputJsonValue,
			cursor: (data.cursor ?? {}) as Prisma.InputJsonValue,
			status: data.status ?? "PENDING",
		},
	});
}

export async function getWorkflowRunById(id: string) {
	return db.workflowRun.findUnique({
		where: { id },
		include: {
			steps: { orderBy: { createdAt: "asc" } },
			waits: { orderBy: { createdAt: "asc" } },
			workflowVersion: true,
			campaign: { select: { id: true, name: true, agentId: true } },
		},
	});
}

export async function listWorkflowRuns(params: {
	campaignId: string;
	status?: WorkflowRunStatus;
	limit?: number;
	offset?: number;
}) {
	const where = {
		campaignId: params.campaignId,
		...(params.status ? { status: params.status } : {}),
	};
	const [runs, total] = await Promise.all([
		db.workflowRun.findMany({
			where,
			orderBy: { createdAt: "desc" },
			take: params.limit ?? 50,
			skip: params.offset ?? 0,
			include: {
				_count: { select: { steps: true } },
				workflowVersion: {
					select: { id: true, version: true, label: true },
				},
			},
		}),
		db.workflowRun.count({ where }),
	]);
	return { runs, total };
}

export async function updateWorkflowRun(
	id: string,
	data: {
		status?: WorkflowRunStatus;
		context?: unknown;
		cursor?: unknown;
		error?: string | null;
		startedAt?: Date | null;
		finishedAt?: Date | null;
		claimedAt?: Date | null;
		claimToken?: string | null;
	},
) {
	return db.workflowRun.update({
		where: { id },
		data: {
			status: data.status,
			context:
				data.context !== undefined
					? (data.context as Prisma.InputJsonValue)
					: undefined,
			cursor:
				data.cursor !== undefined
					? (data.cursor as Prisma.InputJsonValue)
					: undefined,
			error: data.error,
			startedAt: data.startedAt,
			finishedAt: data.finishedAt,
			claimedAt: data.claimedAt,
			claimToken: data.claimToken,
		},
	});
}

/** Claim runnable PENDING/RUNNING runs or WAITING runs that should continue. */
export async function claimRunnableWorkflowRuns(limit = 5) {
	const claimToken = createId();
	const now = new Date();
	const candidates = await db.workflowRun.findMany({
		where: {
			OR: [
				{ status: "PENDING" },
				{
					status: "RUNNING",
					OR: [
						{ claimedAt: null },
						{ claimedAt: { lt: new Date(now.getTime() - 60_000) } },
					],
				},
			],
		},
		orderBy: { createdAt: "asc" },
		take: limit,
		select: { id: true },
	});

	const claimed = [];
	for (const c of candidates) {
		const updated = await db.workflowRun.updateMany({
			where: {
				id: c.id,
				status: { in: ["PENDING", "RUNNING"] },
				OR: [
					{ claimToken: null },
					{ claimedAt: null },
					{ claimedAt: { lt: new Date(now.getTime() - 60_000) } },
				],
			},
			data: {
				status: "RUNNING",
				claimedAt: now,
				claimToken,
			},
		});
		if (updated.count > 0) {
			await db.workflowRun.updateMany({
				where: { id: c.id, startedAt: null },
				data: { startedAt: now },
			});
			const run = await getWorkflowRunById(c.id);
			if (run) {
				claimed.push(run);
			}
		}
	}
	return claimed;
}

export async function createWorkflowStep(data: {
	runId: string;
	nodeId: string;
	nodeType: string;
	attempt?: number;
	status?: WorkflowStepStatus;
	input?: unknown;
	output?: unknown;
	error?: string | null;
	startedAt?: Date | null;
	finishedAt?: Date | null;
}) {
	return db.workflowStep.create({
		data: {
			runId: data.runId,
			nodeId: data.nodeId,
			nodeType: data.nodeType,
			attempt: data.attempt ?? 1,
			status: data.status ?? "PENDING",
			input: (data.input ?? {}) as Prisma.InputJsonValue,
			output: (data.output ?? {}) as Prisma.InputJsonValue,
			error: data.error,
			startedAt: data.startedAt,
			finishedAt: data.finishedAt,
		},
	});
}

export async function updateWorkflowStep(
	id: string,
	data: {
		status?: WorkflowStepStatus;
		input?: unknown;
		output?: unknown;
		error?: string | null;
		startedAt?: Date | null;
		finishedAt?: Date | null;
	},
) {
	return db.workflowStep.update({
		where: { id },
		data: {
			status: data.status,
			input:
				data.input !== undefined
					? (data.input as Prisma.InputJsonValue)
					: undefined,
			output:
				data.output !== undefined
					? (data.output as Prisma.InputJsonValue)
					: undefined,
			error: data.error,
			startedAt: data.startedAt,
			finishedAt: data.finishedAt,
		},
	});
}

export async function getLatestWorkflowStep(runId: string, nodeId: string) {
	return db.workflowStep.findFirst({
		where: { runId, nodeId },
		orderBy: { attempt: "desc" },
	});
}

export async function createWorkflowWait(data: {
	runId: string;
	stepId: string;
	kind: WorkflowWaitKind;
	externalId?: string | null;
	resumeAt?: Date | null;
	payload?: unknown;
	status?: WorkflowWaitStatus;
}) {
	return db.workflowWait.create({
		data: {
			runId: data.runId,
			stepId: data.stepId,
			kind: data.kind,
			externalId: data.externalId,
			resumeAt: data.resumeAt,
			payload: (data.payload ?? {}) as Prisma.InputJsonValue,
			status: data.status ?? "PENDING",
		},
	});
}

export async function findPendingWaitByExternalId(
	kind: WorkflowWaitKind,
	externalId: string,
) {
	return db.workflowWait.findFirst({
		where: { kind, externalId, status: "PENDING" },
		include: {
			run: true,
			step: true,
		},
	});
}

export async function listDueWorkflowWaits(limit = 20) {
	return db.workflowWait.findMany({
		where: {
			status: "PENDING",
			resumeAt: { lte: new Date() },
			kind: { in: ["SCHEDULE", "HUMAN_APPROVAL"] },
		},
		orderBy: { resumeAt: "asc" },
		take: limit,
		include: { run: true, step: true },
	});
}

export async function resumeWorkflowWait(
	waitId: string,
	resumePayload: unknown,
) {
	return db.$transaction(async (tx) => {
		const wait = await tx.workflowWait.update({
			where: { id: waitId },
			data: {
				status: "RESUMED",
				resumePayload: resumePayload as Prisma.InputJsonValue,
			},
			include: { step: true, run: true },
		});
		await tx.workflowStep.update({
			where: { id: wait.stepId },
			data: {
				status: "SUCCEEDED",
				output: resumePayload as Prisma.InputJsonValue,
				finishedAt: new Date(),
			},
		});
		await tx.workflowRun.update({
			where: { id: wait.runId },
			data: {
				status: "PENDING",
				claimedAt: null,
				claimToken: null,
			},
		});
		return wait;
	});
}

export async function createWorkflowApproval(data: {
	organizationId: string;
	runId: string;
	stepId: string;
	waitId: string;
	channel: WorkflowApprovalChannel;
	message?: string | null;
	emailTo?: string | null;
	expiresAt?: Date | null;
}) {
	return db.workflowApproval.create({
		data: {
			organizationId: data.organizationId,
			runId: data.runId,
			stepId: data.stepId,
			waitId: data.waitId,
			channel: data.channel,
			message: data.message,
			emailTo: data.emailTo,
			expiresAt: data.expiresAt,
		},
	});
}

export async function getWorkflowApprovalByToken(token: string) {
	return db.workflowApproval.findUnique({
		where: { token },
		include: {
			wait: true,
			run: true,
			step: true,
		},
	});
}

export async function listWorkflowApprovalsByCampaign(params: {
	campaignId: string;
	decision?: WorkflowApprovalDecision;
	limit?: number;
}) {
	return db.workflowApproval.findMany({
		where: {
			run: { campaignId: params.campaignId },
			...(params.decision ? { decision: params.decision } : {}),
		},
		orderBy: { createdAt: "desc" },
		take: params.limit ?? 50,
		include: {
			run: { select: { id: true, status: true, campaignId: true } },
			step: { select: { nodeId: true, nodeType: true } },
		},
	});
}

export async function decideWorkflowApproval(
	token: string,
	decision: Exclude<WorkflowApprovalDecision, "PENDING">,
	decidedBy?: string,
) {
	const approval = await db.workflowApproval.findUnique({
		where: { token },
		include: { wait: true, step: true },
	});
	if (!approval || approval.decision !== "PENDING") {
		return null;
	}

	return db.workflowApproval.update({
		where: { id: approval.id },
		data: {
			decision,
			decidedBy,
			decidedAt: new Date(),
		},
		include: {
			wait: true,
			step: true,
			run: true,
		},
	});
}

export async function cancelWorkflowRun(id: string) {
	return db.$transaction(async (tx) => {
		await tx.workflowWait.updateMany({
			where: { runId: id, status: "PENDING" },
			data: { status: "CANCELLED" },
		});
		await tx.workflowStep.updateMany({
			where: {
				runId: id,
				status: { in: ["PENDING", "RUNNING", "WAITING"] },
			},
			data: { status: "CANCELLED", finishedAt: new Date() },
		});
		return tx.workflowRun.update({
			where: { id },
			data: {
				status: "CANCELLED",
				finishedAt: new Date(),
				claimedAt: null,
				claimToken: null,
			},
		});
	});
}
