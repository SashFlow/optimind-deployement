import type {
	CallbackScheduleSource,
	CallbackScheduleStatus,
	Prisma,
	ProviderRateUnit,
	UnitSource,
	UsageModality,
} from "../generated/client";
import { db } from "../client";
import { rescheduleCampaignContact } from "./campaigns";

function toJson(value: unknown): Prisma.InputJsonValue {
	return (value ?? {}) as Prisma.InputJsonValue;
}

// --- SessionCollectedField ---

export async function upsertSessionCollectedFields(data: {
	organizationId: string;
	sessionId: string;
	agentId: string;
	fields: Array<{
		key: string;
		label?: string | null;
		fieldType?: string;
		value: unknown;
		required?: boolean;
	}>;
}) {
	const now = new Date();
	const results = [];
	for (const field of data.fields) {
		const row = await db.sessionCollectedField.upsert({
			where: {
				sessionId_key: {
					sessionId: data.sessionId,
					key: field.key,
				},
			},
			create: {
				organizationId: data.organizationId,
				sessionId: data.sessionId,
				agentId: data.agentId,
				key: field.key,
				label: field.label ?? null,
				fieldType: field.fieldType ?? "string",
				value: toJson(field.value),
				required: field.required ?? false,
				capturedAt: now,
			},
			update: {
				label: field.label ?? null,
				fieldType: field.fieldType ?? "string",
				value: toJson(field.value),
				required: field.required ?? false,
				capturedAt: now,
			},
		});
		results.push(row);
	}
	return results;
}

export async function listSessionCollectedFields(opts: {
	organizationId: string;
	sessionId?: string;
	agentId?: string;
	key?: string;
	from?: Date;
	to?: Date;
	limit?: number;
}) {
	return db.sessionCollectedField.findMany({
		where: {
			organizationId: opts.organizationId,
			...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
			...(opts.agentId ? { agentId: opts.agentId } : {}),
			...(opts.key ? { key: opts.key } : {}),
			...(opts.from || opts.to
				? {
						capturedAt: {
							...(opts.from ? { gte: opts.from } : {}),
							...(opts.to ? { lte: opts.to } : {}),
						},
					}
				: {}),
		},
		orderBy: { capturedAt: "desc" },
		take: opts.limit ?? 100,
		include: {
			session: {
				select: {
					id: true,
					status: true,
					startedAt: true,
					agentId: true,
				},
			},
		},
	});
}

// --- CallbackSchedule ---

export async function scheduleCallback(data: {
	organizationId: string;
	sessionId?: string | null;
	campaignId?: string | null;
	campaignContactId?: string | null;
	phoneE164: string;
	scheduledAt: Date;
	source?: CallbackScheduleSource;
	contactMetadata?: unknown;
}) {
	const callback = await db.callbackSchedule.create({
		data: {
			organizationId: data.organizationId,
			sessionId: data.sessionId ?? null,
			campaignId: data.campaignId ?? null,
			campaignContactId: data.campaignContactId ?? null,
			phoneE164: data.phoneE164,
			scheduledAt: data.scheduledAt,
			status: "QUEUED",
			source: data.source ?? "RESCHEDULE",
			contactMetadata: toJson(data.contactMetadata ?? {}),
		},
	});

	if (data.campaignContactId) {
		await rescheduleCampaignContact(
			data.campaignContactId,
			data.scheduledAt,
		);
	}

	return callback;
}

export async function listCallbackSchedules(opts: {
	organizationId: string;
	campaignId?: string;
	status?: CallbackScheduleStatus;
	from?: Date;
	to?: Date;
	limit?: number;
}) {
	return db.callbackSchedule.findMany({
		where: {
			organizationId: opts.organizationId,
			...(opts.campaignId ? { campaignId: opts.campaignId } : {}),
			...(opts.status ? { status: opts.status } : {}),
			...(opts.from || opts.to
				? {
						scheduledAt: {
							...(opts.from ? { gte: opts.from } : {}),
							...(opts.to ? { lte: opts.to } : {}),
						},
					}
				: {}),
		},
		orderBy: { scheduledAt: "asc" },
		take: opts.limit ?? 100,
	});
}

export async function updateCallbackScheduleStatus(
	id: string,
	data: {
		status: CallbackScheduleStatus;
		completedSessionId?: string | null;
		errorMessage?: string | null;
	},
) {
	return db.callbackSchedule.update({
		where: { id },
		data: {
			status: data.status,
			completedSessionId: data.completedSessionId,
			errorMessage: data.errorMessage,
		},
	});
}

// --- ProviderRate ---

export async function listProviderRates(opts?: {
	organizationId?: string | null;
	includePlatformDefaults?: boolean;
}) {
	const orgId = opts?.organizationId;
	const includeDefaults = opts?.includePlatformDefaults !== false;

	if (!orgId && !includeDefaults) {
		return [];
	}

	return db.providerRate.findMany({
		where: {
			OR: [
				...(orgId ? [{ organizationId: orgId }] : []),
				...(includeDefaults ? [{ organizationId: null }] : []),
			],
		},
		orderBy: [
			{ modality: "asc" },
			{ provider: "asc" },
			{ effectiveFrom: "desc" },
		],
	});
}

export async function createProviderRate(data: {
	organizationId?: string | null;
	modality: UsageModality;
	provider: string;
	model?: string | null;
	unit: ProviderRateUnit;
	unitAmountMicros: number;
	currency?: string;
	unitSource?: UnitSource | null;
	effectiveFrom?: Date;
	effectiveTo?: Date | null;
}) {
	return db.providerRate.create({
		data: {
			organizationId: data.organizationId ?? null,
			modality: data.modality,
			provider: data.provider,
			model: data.model ?? null,
			unit: data.unit,
			unitAmountMicros: data.unitAmountMicros,
			currency: data.currency ?? "USD",
			unitSource: data.unitSource ?? null,
			effectiveFrom: data.effectiveFrom ?? new Date(),
			effectiveTo: data.effectiveTo ?? null,
		},
	});
}

export async function updateProviderRate(
	id: string,
	data: {
		unitAmountMicros?: number;
		currency?: string;
		model?: string | null;
		effectiveTo?: Date | null;
		unit?: ProviderRateUnit;
		unitSource?: UnitSource | null;
	},
) {
	return db.providerRate.update({ where: { id }, data });
}

export async function deleteProviderRate(id: string) {
	return db.providerRate.delete({ where: { id } });
}

export async function getEffectiveProviderRates(
	organizationId: string,
	at: Date = new Date(),
) {
	const all = await db.providerRate.findMany({
		where: {
			OR: [{ organizationId }, { organizationId: null }],
			effectiveFrom: { lte: at },
		},
		orderBy: { effectiveFrom: "desc" },
	});

	const active = all.filter(
		(r) => r.effectiveTo == null || r.effectiveTo > at,
	);

	const map = new Map<string, (typeof active)[number]>();
	for (const rate of active) {
		const key = `${rate.modality}|${rate.provider}|${rate.model ?? ""}|${rate.unit}`;
		const existing = map.get(key);
		if (!existing) {
			map.set(key, rate);
			continue;
		}
		if (existing.organizationId == null && rate.organizationId != null) {
			map.set(key, rate);
		}
	}
	return Array.from(map.values());
}

/** Estimate cost micros from a SessionUsage row using effective rates. */
export function estimateUsageCostMicros(
	usage: {
		modality: UsageModality;
		provider: string;
		model: string;
		inputTokens: number;
		outputTokens: number;
		charactersCount: number;
		audioDurationMs: number;
		callDurationMs: number;
		totalRequests: number;
		egressMinutes: number;
		billableMinutes: number;
	},
	rates: Array<{
		modality: UsageModality;
		provider: string;
		model: string | null;
		unit: ProviderRateUnit;
		unitAmountMicros: number;
	}>,
): number {
	const match = (unit: ProviderRateUnit) => {
		const exact = rates.find(
			(r) =>
				r.modality === usage.modality &&
				r.provider.toLowerCase() === usage.provider.toLowerCase() &&
				r.unit === unit &&
				r.model != null &&
				r.model.toLowerCase() === usage.model.toLowerCase(),
		);
		if (exact) return exact;
		return rates.find(
			(r) =>
				r.modality === usage.modality &&
				r.provider.toLowerCase() === usage.provider.toLowerCase() &&
				r.unit === unit &&
				(r.model == null || r.model === ""),
		);
	};

	let micros = 0;
	const tokenRate = match("TOKEN");
	if (tokenRate) {
		micros +=
			(usage.inputTokens + usage.outputTokens) *
			tokenRate.unitAmountMicros;
	}
	const charRate = match("CHARACTER");
	if (charRate) {
		micros += usage.charactersCount * charRate.unitAmountMicros;
	}
	const minuteRate = match("MINUTE");
	if (minuteRate) {
		const ms =
			usage.audioDurationMs ||
			usage.callDurationMs ||
			usage.egressMinutes * 60_000 ||
			usage.billableMinutes * 60_000;
		micros += (ms / 60_000) * minuteRate.unitAmountMicros;
	}
	const requestRate = match("REQUEST");
	if (requestRate) {
		micros += usage.totalRequests * requestRate.unitAmountMicros;
	}
	return Math.round(micros);
}
