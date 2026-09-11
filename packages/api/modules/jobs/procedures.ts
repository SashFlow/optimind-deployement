import { ORPCError } from "@orpc/client";
import {
	cancelWorkflowRun,
	getCampaignContactById,
	getDocumentById,
	getEgressJobById,
	getWorkflowRunById,
	listBackgroundJobs,
	parseBackgroundJobId,
	updateCampaignContact,
	updateDocument,
	updateEgressJob,
} from "@repo/database";
import { stopEgress } from "@repo/livekit";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";

const jobTypeSchema = z.enum([
	"campaign_dial",
	"egress",
	"knowledge_ingest",
	"plivo_provision",
	"celery_generic",
]);

const statusSchema = z.enum([
	"pending",
	"running",
	"completed",
	"failed",
	"cancelled",
	"retrying",
]);

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/jobs",
		tags: ["Jobs"],
		summary: "List organization background jobs",
	})
	.input(
		z.object({
			organizationId: z.string(),
			status: statusSchema.optional(),
			jobType: jobTypeSchema.optional(),
			job_type: jobTypeSchema.optional(),
			limit: z.number().int().positive().max(500).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		const { rows, total } = await listBackgroundJobs(input.organizationId, {
			status: input.status,
			jobType: input.jobType ?? input.job_type,
			limit: input.limit,
		});

		return { total, jobs: rows };
	});

export const cancel = protectedProcedure
	.route({
		method: "POST",
		path: "/jobs/{id}/cancel",
		tags: ["Jobs"],
		summary: "Cancel a background job",
	})
	.input(
		z.object({
			id: z.string(),
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		const parsed = parseBackgroundJobId(input.id);
		if (!parsed) {
			throw new ORPCError("BAD_REQUEST");
		}

		const { jobType, resourceId } = parsed;

		switch (jobType) {
			case "egress": {
				const job = await getEgressJobById(resourceId);
				if (!job || job.organizationId !== input.organizationId) {
					throw new ORPCError("NOT_FOUND");
				}
				if (
					job.status === "COMPLETE" ||
					job.status === "FAILED" ||
					job.status === "ABORTED"
				) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Egress job is already finished",
					});
				}
				if (job.livekitEgressId) {
					try {
						await stopEgress(job.livekitEgressId);
					} catch {
						// Still mark aborted locally if LiveKit stop fails
					}
				}
				await updateEgressJob(job.id, {
					status: "ABORTED",
					errorMessage: job.errorMessage ?? "Cancelled by user",
				});
				return { ok: true };
			}
			case "knowledge_ingest": {
				const doc = await getDocumentById(resourceId);
				if (
					!doc ||
					doc.knowledgeBase.organizationId !== input.organizationId
				) {
					throw new ORPCError("NOT_FOUND");
				}
				if (doc.status === "READY" || doc.status === "DELETED") {
					throw new ORPCError("BAD_REQUEST", {
						message: "Document job cannot be cancelled",
					});
				}
				await updateDocument(doc.id, {
					status: "FAILED",
					errorMessage: "Cancelled by user",
				});
				return { ok: true };
			}
			case "campaign_dial": {
				const contact = await getCampaignContactById(resourceId);
				if (
					!contact ||
					contact.organizationId !== input.organizationId
				) {
					throw new ORPCError("NOT_FOUND");
				}
				if (
					contact.status === "COMPLETED" ||
					contact.status === "CANCELLED" ||
					contact.status === "DO_NOT_CONTACT" ||
					contact.status === "SKIPPED"
				) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Dial job cannot be cancelled",
					});
				}
				await updateCampaignContact(contact.id, {
					status: "CANCELLED",
					lastOutcome: "Cancelled by user",
				});
				return { ok: true };
			}
			case "celery_generic": {
				const run = await getWorkflowRunById(resourceId);
				if (!run || run.organizationId !== input.organizationId) {
					throw new ORPCError("NOT_FOUND");
				}
				if (
					run.status === "SUCCEEDED" ||
					run.status === "FAILED" ||
					run.status === "CANCELLED"
				) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Workflow run is already finished",
					});
				}
				await cancelWorkflowRun(run.id);
				return { ok: true };
			}
			default:
				throw new ORPCError("BAD_REQUEST", {
					message: `Cancel is not supported for job type ${jobType}`,
				});
		}
	});

export const retry = protectedProcedure
	.route({
		method: "POST",
		path: "/jobs/{id}/retry",
		tags: ["Jobs"],
		summary: "Retry a background job",
	})
	.input(
		z.object({
			id: z.string(),
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		const parsed = parseBackgroundJobId(input.id);
		if (!parsed) {
			throw new ORPCError("BAD_REQUEST");
		}

		const { jobType, resourceId } = parsed;

		switch (jobType) {
			case "knowledge_ingest": {
				const doc = await getDocumentById(resourceId);
				if (
					!doc ||
					doc.knowledgeBase.organizationId !== input.organizationId
				) {
					throw new ORPCError("NOT_FOUND");
				}
				if (doc.status !== "FAILED" && doc.status !== "PENDING") {
					throw new ORPCError("BAD_REQUEST", {
						message: "Only failed or pending ingest jobs can retry",
					});
				}
				await updateDocument(doc.id, {
					status: "PENDING",
					errorMessage: null,
				});
				const { processKnowledgeDocument } = await import(
					"../knowledge/lib/process-document"
				);
				await processKnowledgeDocument({ documentId: doc.id });
				return { ok: true };
			}
			case "campaign_dial": {
				const contact = await getCampaignContactById(resourceId);
				if (
					!contact ||
					contact.organizationId !== input.organizationId
				) {
					throw new ORPCError("NOT_FOUND");
				}
				if (
					contact.status !== "FAILED" &&
					contact.status !== "CANCELLED" &&
					contact.status !== "PAUSED"
				) {
					throw new ORPCError("BAD_REQUEST", {
						message:
							"Only failed, cancelled, or paused dial jobs can retry",
					});
				}
				await updateCampaignContact(contact.id, {
					status: "QUEUED",
					nextAttemptAt: new Date(),
					lastOutcome: null,
				});
				return { ok: true };
			}
			case "celery_generic": {
				throw new ORPCError("BAD_REQUEST", {
					message: "Workflow runs cannot be retried from this view",
				});
			}
			case "egress": {
				throw new ORPCError("BAD_REQUEST", {
					message: "Egress jobs cannot be retried",
				});
			}
			default:
				throw new ORPCError("BAD_REQUEST", {
					message: `Retry is not supported for job type ${jobType}`,
				});
		}
	});
