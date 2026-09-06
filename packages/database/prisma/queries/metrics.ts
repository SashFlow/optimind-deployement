import type {
	Prisma,
	UsageMetricCategory,
	UsageMetricSource,
} from "../generated/client";
import { db } from "../client";

export async function ingestUsageMetric(data: {
	organizationId: string;
	source: UsageMetricSource;
	category: UsageMetricCategory;
	metric: string;
	value: number | string;
	unit: string;
	provider?: string;
	agentId?: string;
	campaignId?: string;
	campaignSessionId?: string;
	recordedAt?: Date;
	metadata?: Prisma.InputJsonValue;
}) {
	return db.usageMetric.create({
		data: {
			organizationId: data.organizationId,
			source: data.source,
			category: data.category,
			metric: data.metric,
			value: data.value,
			unit: data.unit,
			provider: data.provider,
			agentId: data.agentId,
			campaignId: data.campaignId,
			campaignSessionId: data.campaignSessionId,
			recordedAt: data.recordedAt ?? new Date(),
			metadata: data.metadata ?? {},
		},
	});
}

export async function aggregateUsageByAgent(
	organizationId: string,
	opts?: { agentId?: string; from?: Date; to?: Date },
) {
	const where: Prisma.UsageMetricWhereInput = {
		organizationId,
		...(opts?.agentId ? { agentId: opts.agentId } : { agentId: { not: null } }),
		...(opts?.from || opts?.to
			? {
					recordedAt: {
						...(opts.from ? { gte: opts.from } : {}),
						...(opts.to ? { lte: opts.to } : {}),
					},
				}
			: {}),
	};

	const rows = await db.usageMetric.groupBy({
		by: ["agentId", "category", "metric", "unit", "provider"],
		where,
		_sum: { value: true },
		_count: { _all: true },
	});

	return rows;
}

export async function aggregateUsageByCampaign(
	organizationId: string,
	opts?: { campaignId?: string; from?: Date; to?: Date },
) {
	const where: Prisma.UsageMetricWhereInput = {
		organizationId,
		...(opts?.campaignId
			? { campaignId: opts.campaignId }
			: { campaignId: { not: null } }),
		...(opts?.from || opts?.to
			? {
					recordedAt: {
						...(opts.from ? { gte: opts.from } : {}),
						...(opts.to ? { lte: opts.to } : {}),
					},
				}
			: {}),
	};

	const rows = await db.usageMetric.groupBy({
		by: ["campaignId", "category", "metric", "unit", "provider"],
		where,
		_sum: { value: true },
		_count: { _all: true },
	});

	return rows;
}

export async function listUsageMetrics(
	organizationId: string,
	opts?: {
		agentId?: string;
		campaignId?: string;
		limit?: number;
		offset?: number;
	},
) {
	return db.usageMetric.findMany({
		where: {
			organizationId,
			...(opts?.agentId ? { agentId: opts.agentId } : {}),
			...(opts?.campaignId ? { campaignId: opts.campaignId } : {}),
		},
		orderBy: { recordedAt: "desc" },
		take: opts?.limit ?? 100,
		skip: opts?.offset ?? 0,
	});
}
