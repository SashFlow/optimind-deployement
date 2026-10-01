import { db } from "../client";
import type {
	CallbackScheduleSource,
	CallbackScheduleStatus,
	Prisma,
	UsageModality,
} from "../generated/client";
import { rescheduleCampaignContact } from "./campaigns";
import type { ProviderRateUnit } from "./provider-rates";

function toJson(value: unknown): Prisma.InputJsonValue {
	return (value ?? {}) as Prisma.InputJsonValue;
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

/** Estimate cost micros from a SessionUsage row using the given rates. */
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
		if (exact) {
			return exact;
		}
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
