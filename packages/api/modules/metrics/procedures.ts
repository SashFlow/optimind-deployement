import {
	aggregateUsageByAgent,
	aggregateUsageByCampaign,
	ingestUsageMetric,
	listUsageMetrics,
} from "@repo/database";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";

export const ingest = protectedProcedure
	.route({
		method: "POST",
		path: "/metrics",
		tags: ["Metrics"],
		summary: "Ingest usage metric",
	})
	.input(
		z.object({
			organizationId: z.string(),
			source: z.enum(["AGENT", "CAMPAIGN", "SESSION"]),
			category: z.enum([
				"LLM",
				"STT",
				"TTS",
				"AVATAR",
				"SIP",
				"EGRESS",
				"ROOM",
			]),
			metric: z.string(),
			value: z.union([z.number(), z.string()]),
			unit: z.string(),
			provider: z.string().optional(),
			agentId: z.string().optional(),
			campaignId: z.string().optional(),
			campaignSessionId: z.string().optional(),
			recordedAt: z.coerce.date().optional(),
			metadata: z.record(z.string(), z.unknown()).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const metric = await ingestUsageMetric({
			...input,
			metadata: input.metadata as object | undefined,
		});
		return { metric };
	});

export const byAgent = protectedProcedure
	.route({
		method: "GET",
		path: "/metrics/by-agent",
		tags: ["Metrics"],
		summary: "Aggregate by agent",
	})
	.input(
		z.object({
			organizationId: z.string(),
			agentId: z.string().optional(),
			from: z.coerce.date().optional(),
			to: z.coerce.date().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const rows = await aggregateUsageByAgent(input.organizationId, {
			agentId: input.agentId,
			from: input.from,
			to: input.to,
		});
		return { rows };
	});

export const byCampaign = protectedProcedure
	.route({
		method: "GET",
		path: "/metrics/by-campaign",
		tags: ["Metrics"],
		summary: "Aggregate by campaign",
	})
	.input(
		z.object({
			organizationId: z.string(),
			campaignId: z.string().optional(),
			from: z.coerce.date().optional(),
			to: z.coerce.date().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const rows = await aggregateUsageByCampaign(input.organizationId, {
			campaignId: input.campaignId,
			from: input.from,
			to: input.to,
		});
		return { rows };
	});

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/metrics",
		tags: ["Metrics"],
		summary: "List usage metrics",
	})
	.input(
		z.object({
			organizationId: z.string(),
			agentId: z.string().optional(),
			campaignId: z.string().optional(),
			limit: z.number().int().optional(),
			offset: z.number().int().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const metrics = await listUsageMetrics(input.organizationId, input);
		return { metrics };
	});
