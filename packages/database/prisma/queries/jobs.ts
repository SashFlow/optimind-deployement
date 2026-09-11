import { db } from "../client";

export type BackgroundJobRow = {
	id: string;
	created_at: string | null;
	job_type: string;
	status: string;
	resource_type: string | null;
	resource_id: string | null;
	error: string | null;
};

const JOB_ID_SEP = ":";

export function makeBackgroundJobId(jobType: string, resourceId: string) {
	return `${jobType}${JOB_ID_SEP}${resourceId}`;
}

export function parseBackgroundJobId(id: string): {
	jobType: string;
	resourceId: string;
} | null {
	const idx = id.indexOf(JOB_ID_SEP);
	if (idx <= 0 || idx === id.length - 1) {
		return null;
	}
	return {
		jobType: id.slice(0, idx),
		resourceId: id.slice(idx + 1),
	};
}

function mapEgressStatus(status: string): string {
	switch (status) {
		case "STARTING":
			return "pending";
		case "ACTIVE":
		case "ENDING":
			return "running";
		case "COMPLETE":
			return "completed";
		case "FAILED":
			return "failed";
		case "ABORTED":
			return "cancelled";
		default:
			return status.toLowerCase();
	}
}

function mapDocumentStatus(status: string): string {
	switch (status) {
		case "PENDING":
			return "pending";
		case "PROCESSING":
			return "running";
		case "READY":
			return "completed";
		case "FAILED":
			return "failed";
		default:
			return status.toLowerCase();
	}
}

function mapContactStatus(status: string): string {
	switch (status) {
		case "PENDING":
		case "QUEUED":
		case "PAUSED":
			return "pending";
		case "IN_PROGRESS":
			return "running";
		case "RESCHEDULED":
			return "retrying";
		case "COMPLETED":
			return "completed";
		case "FAILED":
			return "failed";
		case "CANCELLED":
		case "SKIPPED":
		case "DO_NOT_CONTACT":
			return "cancelled";
		default:
			return status.toLowerCase();
	}
}

function mapWorkflowStatus(status: string): string {
	switch (status) {
		case "PENDING":
			return "pending";
		case "RUNNING":
		case "WAITING":
			return "running";
		case "SUCCEEDED":
			return "completed";
		case "FAILED":
			return "failed";
		case "CANCELLED":
			return "cancelled";
		default:
			return status.toLowerCase();
	}
}

export async function listBackgroundJobs(
	organizationId: string,
	opts?: {
		status?: string;
		jobType?: string;
		limit?: number;
	},
): Promise<{ rows: BackgroundJobRow[]; total: number }> {
	const limit = opts?.limit ?? 200;
	const jobType = opts?.jobType;

	const [egressJobs, documents, contacts, workflowRuns] = await Promise.all([
		!jobType || jobType === "egress"
			? db.egressJob.findMany({
					where: { organizationId },
					orderBy: { createdAt: "desc" },
					take: limit,
					select: {
						id: true,
						createdAt: true,
						status: true,
						errorMessage: true,
						agentSessionId: true,
						campaignSessionId: true,
					},
				})
			: Promise.resolve([]),
		!jobType || jobType === "knowledge_ingest"
			? db.document.findMany({
					where: {
						status: { not: "DELETED" },
						knowledgeBase: { organizationId },
					},
					orderBy: { createdAt: "desc" },
					take: limit,
					select: {
						id: true,
						createdAt: true,
						status: true,
						errorMessage: true,
						knowledgeBaseId: true,
					},
				})
			: Promise.resolve([]),
		!jobType || jobType === "campaign_dial"
			? db.campaignContact.findMany({
					where: { organizationId },
					orderBy: { updatedAt: "desc" },
					take: limit,
					select: {
						id: true,
						createdAt: true,
						status: true,
						lastOutcome: true,
						campaignId: true,
					},
				})
			: Promise.resolve([]),
		!jobType || jobType === "celery_generic"
			? db.workflowRun.findMany({
					where: { organizationId },
					orderBy: { createdAt: "desc" },
					take: limit,
					select: {
						id: true,
						createdAt: true,
						status: true,
						error: true,
						campaignId: true,
					},
				})
			: Promise.resolve([]),
	]);

	const rows: BackgroundJobRow[] = [
		...egressJobs.map((job) => ({
			id: makeBackgroundJobId("egress", job.id),
			created_at: job.createdAt.toISOString(),
			job_type: "egress",
			status: mapEgressStatus(job.status),
			resource_type: "egress",
			resource_id: job.id,
			error: job.errorMessage,
		})),
		...documents.map((doc) => ({
			id: makeBackgroundJobId("knowledge_ingest", doc.id),
			created_at: doc.createdAt.toISOString(),
			job_type: "knowledge_ingest",
			status: mapDocumentStatus(doc.status),
			resource_type: "knowledge_source",
			resource_id: doc.id,
			error: doc.errorMessage,
		})),
		...contacts.map((contact) => ({
			id: makeBackgroundJobId("campaign_dial", contact.id),
			created_at: contact.createdAt.toISOString(),
			job_type: "campaign_dial",
			status: mapContactStatus(contact.status),
			resource_type: "campaign",
			resource_id: contact.campaignId,
			error: contact.lastOutcome,
		})),
		...workflowRuns.map((run) => ({
			id: makeBackgroundJobId("celery_generic", run.id),
			created_at: run.createdAt.toISOString(),
			job_type: "celery_generic",
			status: mapWorkflowStatus(run.status),
			resource_type: "campaign",
			resource_id: run.campaignId,
			error: run.error,
		})),
	];

	const filtered = opts?.status
		? rows.filter((row) => row.status === opts.status)
		: rows;

	filtered.sort((a, b) => {
		const aTime = a.created_at ? Date.parse(a.created_at) : 0;
		const bTime = b.created_at ? Date.parse(b.created_at) : 0;
		return bTime - aTime;
	});

	const sliced = filtered.slice(0, limit);
	return { rows: sliced, total: filtered.length };
}
