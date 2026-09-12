import { db } from "../client";
import {
	estimateUsageCostMicros,
	getEffectiveProviderRates,
} from "./analytics";

function percentile(sorted: number[], p: number): number | null {
	if (sorted.length === 0) return null;
	const idx = Math.min(
		sorted.length - 1,
		Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
	);
	return sorted[idx] ?? null;
}

function dateKey(d: Date) {
	return d.toISOString().slice(0, 10);
}

export async function aggregateSessionStats(opts: {
	organizationId: string;
	since: Date;
	agentId?: string;
}) {
	const sessions = await db.agentSession.findMany({
		where: {
			organizationId: opts.organizationId,
			createdAt: { gte: opts.since },
			...(opts.agentId ? { agentId: opts.agentId } : {}),
		},
		select: {
			id: true,
			status: true,
			channel: true,
			direction: true,
			durationMs: true,
			startedAt: true,
			connectedAt: true,
			endedAt: true,
			endReason: true,
			createdAt: true,
			agentId: true,
			fromNumber: true,
			toNumber: true,
			sipTrunkId: true,
			errorCode: true,
			errorMessage: true,
			agent: { select: { id: true, name: true } },
		},
	});

	const activeStatuses = new Set(["QUEUED", "ACTIVE"]);
	const completed = sessions.filter((s) => s.status === "COMPLETED");
	const failed = sessions.filter((s) => s.status === "FAILED");
	const durations = sessions
		.map((s) => s.durationMs)
		.filter((ms): ms is number => typeof ms === "number" && ms > 0)
		.sort((a, b) => a - b);
	const connectTimes = sessions
		.map((s) => {
			if (!s.startedAt || !s.connectedAt) return null;
			return s.connectedAt.getTime() - s.startedAt.getTime();
		})
		.filter((ms): ms is number => typeof ms === "number" && ms >= 0)
		.sort((a, b) => a - b);

	const byChannel: Record<string, number> = {};
	const byDirection: Record<string, number> = {};
	const byEndReason: Record<string, number> = {};
	const byAgent = new Map<
		string,
		{ agentId: string; name: string; count: number; completed: number; failed: number; durationSum: number }
	>();

	for (const session of sessions) {
		byChannel[session.channel] = (byChannel[session.channel] ?? 0) + 1;
		byDirection[session.direction] =
			(byDirection[session.direction] ?? 0) + 1;
		if (session.endReason) {
			byEndReason[session.endReason] =
				(byEndReason[session.endReason] ?? 0) + 1;
		}
		const agentBucket = byAgent.get(session.agentId) ?? {
			agentId: session.agentId,
			name: session.agent.name,
			count: 0,
			completed: 0,
			failed: 0,
			durationSum: 0,
		};
		agentBucket.count += 1;
		if (session.status === "COMPLETED") agentBucket.completed += 1;
		if (session.status === "FAILED") agentBucket.failed += 1;
		agentBucket.durationSum += session.durationMs ?? 0;
		byAgent.set(session.agentId, agentBucket);
	}

	return {
		sessions,
		totals: {
			total_sessions: sessions.length,
			active_sessions: sessions.filter((s) =>
				activeStatuses.has(s.status),
			).length,
			completed_sessions: completed.length,
			failed_sessions: failed.length,
			avg_duration_ms:
				durations.length > 0
					? Math.round(
							durations.reduce((a, b) => a + b, 0) /
								durations.length,
						)
					: null,
			p50_duration_ms: percentile(durations, 50),
			p95_duration_ms: percentile(durations, 95),
			avg_time_to_connect_ms:
				connectTimes.length > 0
					? Math.round(
							connectTimes.reduce((a, b) => a + b, 0) /
								connectTimes.length,
						)
					: null,
			failure_rate:
				sessions.length > 0 ? failed.length / sessions.length : null,
			success_rate:
				sessions.length > 0
					? completed.length / sessions.length
					: null,
		},
		by_channel: byChannel,
		by_direction: byDirection,
		by_end_reason: byEndReason,
		by_agent: Array.from(byAgent.values()).map((a) => ({
			...a,
			avg_duration_ms:
				a.count > 0 ? Math.round(a.durationSum / a.count) : null,
		})),
	};
}

export async function aggregateUsage(opts: {
	organizationId: string;
	since: Date;
	agentId?: string;
}) {
	const usages = await db.sessionUsage.findMany({
		where: {
			organizationId: opts.organizationId,
			capturedAt: { gte: opts.since },
			...(opts.agentId ? { agentId: opts.agentId } : {}),
		},
	});

	const daily = new Map<
		string,
		{
			date: string;
			input_tokens: number;
			output_tokens: number;
			characters: number;
			audio_ms: number;
			requests: number;
		}
	>();
	const byModality = new Map<
		string,
		{
			modality: string;
			input_tokens: number;
			output_tokens: number;
			characters: number;
			audio_ms: number;
			requests: number;
		}
	>();
	const byProviderModel = new Map<
		string,
		{
			modality: string;
			provider: string;
			model: string;
			input_tokens: number;
			output_tokens: number;
			characters: number;
			audio_ms: number;
			requests: number;
		}
	>();

	for (const u of usages) {
		const day = dateKey(u.capturedAt);
		const d = daily.get(day) ?? {
			date: day,
			input_tokens: 0,
			output_tokens: 0,
			characters: 0,
			audio_ms: 0,
			requests: 0,
		};
		d.input_tokens += u.inputTokens;
		d.output_tokens += u.outputTokens;
		d.characters += u.charactersCount;
		d.audio_ms += u.audioDurationMs;
		d.requests += u.totalRequests;
		daily.set(day, d);

		const mod = byModality.get(u.modality) ?? {
			modality: u.modality,
			input_tokens: 0,
			output_tokens: 0,
			characters: 0,
			audio_ms: 0,
			requests: 0,
		};
		mod.input_tokens += u.inputTokens;
		mod.output_tokens += u.outputTokens;
		mod.characters += u.charactersCount;
		mod.audio_ms += u.audioDurationMs;
		mod.requests += u.totalRequests;
		byModality.set(u.modality, mod);

		const pmKey = `${u.modality}|${u.provider}|${u.model}`;
		const pm = byProviderModel.get(pmKey) ?? {
			modality: u.modality,
			provider: u.provider,
			model: u.model,
			input_tokens: 0,
			output_tokens: 0,
			characters: 0,
			audio_ms: 0,
			requests: 0,
		};
		pm.input_tokens += u.inputTokens;
		pm.output_tokens += u.outputTokens;
		pm.characters += u.charactersCount;
		pm.audio_ms += u.audioDurationMs;
		pm.requests += u.totalRequests;
		byProviderModel.set(pmKey, pm);
	}

	const totals = {
		input_tokens: usages.reduce((s, u) => s + u.inputTokens, 0),
		output_tokens: usages.reduce((s, u) => s + u.outputTokens, 0),
		characters: usages.reduce((s, u) => s + u.charactersCount, 0),
		audio_ms: usages.reduce((s, u) => s + u.audioDurationMs, 0),
		requests: usages.reduce((s, u) => s + u.totalRequests, 0),
	};

	return {
		totals,
		daily: Array.from(daily.values()).sort((a, b) =>
			a.date.localeCompare(b.date),
		),
		by_modality: Array.from(byModality.values()),
		by_provider_model: Array.from(byProviderModel.values()),
		usages,
	};
}

export async function aggregateCost(opts: {
	organizationId: string;
	since: Date;
	agentId?: string;
}) {
	const { usages } = await aggregateUsage(opts);
	const rates = await getEffectiveProviderRates(opts.organizationId);

	const daily = new Map<
		string,
		{ date: string; cost_micros: number; currency: string }
	>();
	const byModality = new Map<
		string,
		{ modality: string; cost_micros: number }
	>();
	const byAgent = new Map<
		string,
		{ agentId: string; cost_micros: number }
	>();

	let totalMicros = 0;
	for (const u of usages) {
		const micros = estimateUsageCostMicros(u, rates);
		totalMicros += micros;
		const day = dateKey(u.capturedAt);
		const d = daily.get(day) ?? {
			date: day,
			cost_micros: 0,
			currency: "USD",
		};
		d.cost_micros += micros;
		daily.set(day, d);

		const mod = byModality.get(u.modality) ?? {
			modality: u.modality,
			cost_micros: 0,
		};
		mod.cost_micros += micros;
		byModality.set(u.modality, mod);

		const ag = byAgent.get(u.agentId) ?? {
			agentId: u.agentId,
			cost_micros: 0,
		};
		ag.cost_micros += micros;
		byAgent.set(u.agentId, ag);
	}

	return {
		total_cost_micros: totalMicros,
		total_cost_usd: totalMicros / 1_000_000,
		currency: "USD",
		daily: Array.from(daily.values()).sort((a, b) =>
			a.date.localeCompare(b.date),
		),
		by_modality: Array.from(byModality.values()),
		by_agent: Array.from(byAgent.values()),
	};
}

export async function aggregateQuality(opts: {
	organizationId: string;
	since: Date;
	agentId?: string;
}) {
	const transcripts = await db.transcript.findMany({
		where: {
			organizationId: opts.organizationId,
			createdAt: { gte: opts.since },
			...(opts.agentId ? { agentId: opts.agentId } : {}),
		},
		include: {
			segments: true,
			session: { select: { durationMs: true, status: true } },
		},
	});

	let totalWords = 0;
	let totalTurns = 0;
	let userTurns = 0;
	let assistantTurns = 0;
	let userMs = 0;
	let assistantMs = 0;
	let interrupted = 0;
	let confidenceSum = 0;
	let confidenceCount = 0;
	const statusMix: Record<string, number> = {};

	for (const t of transcripts) {
		totalWords += t.wordCount;
		statusMix[t.status] = (statusMix[t.status] ?? 0) + 1;
		for (const seg of t.segments) {
			totalTurns += 1;
			if (seg.role === "USER") userTurns += 1;
			if (seg.role === "ASSISTANT") assistantTurns += 1;
			const dur =
				seg.startMs != null && seg.endMs != null
					? Math.max(0, seg.endMs - seg.startMs)
					: 0;
			if (seg.role === "USER") userMs += dur;
			if (seg.role === "ASSISTANT") assistantMs += dur;
			if (seg.interrupted) interrupted += 1;
			if (typeof seg.confidence === "number") {
				confidenceSum += seg.confidence;
				confidenceCount += 1;
			}
		}
	}

	const speakMs = userMs + assistantMs;
	return {
		transcript_count: transcripts.length,
		avg_word_count:
			transcripts.length > 0
				? Math.round(totalWords / transcripts.length)
				: null,
		avg_turns:
			transcripts.length > 0
				? Math.round((totalTurns / transcripts.length) * 10) / 10
				: null,
		user_turns: userTurns,
		assistant_turns: assistantTurns,
		talk_ratio_user:
			speakMs > 0 ? Math.round((userMs / speakMs) * 1000) / 1000 : null,
		interruption_rate:
			totalTurns > 0
				? Math.round((interrupted / totalTurns) * 1000) / 1000
				: null,
		avg_confidence:
			confidenceCount > 0
				? Math.round((confidenceSum / confidenceCount) * 1000) / 1000
				: null,
		status_mix: statusMix,
	};
}

export async function aggregateActions(opts: {
	organizationId: string;
	since: Date;
	agentId?: string;
	sessionIds?: string[];
}) {
	const sessionFilter = opts.agentId
		? {
				session: {
					agentId: opts.agentId,
					organizationId: opts.organizationId,
					createdAt: { gte: opts.since },
				},
			}
		: {
				organizationId: opts.organizationId,
				occurredAt: { gte: opts.since },
			};

	const events = await db.sessionEvent.findMany({
		where: {
			organizationId: opts.organizationId,
			occurredAt: { gte: opts.since },
			...(opts.agentId
				? { session: { agentId: opts.agentId } }
				: {}),
			eventType: {
				in: [
					"transfer_started",
					"amd_result",
					"reschedule_requested",
					"voicemail_retry_scheduled",
					"end_call",
				],
			},
		},
		select: { eventType: true, payload: true, sessionId: true },
	});

	const toolCalls = await db.toolCallRecord.findMany({
		where: {
			organizationId: opts.organizationId,
			createdAt: { gte: opts.since },
			...(opts.agentId
				? { session: { agentId: opts.agentId } }
				: {}),
		},
	});

	const toolByName = new Map<
		string,
		{
			toolName: string;
			count: number;
			failed: number;
			latency_sum_ms: number;
			latency_count: number;
		}
	>();
	for (const tc of toolCalls) {
		const row = toolByName.get(tc.toolName) ?? {
			toolName: tc.toolName,
			count: 0,
			failed: 0,
			latency_sum_ms: 0,
			latency_count: 0,
		};
		row.count += 1;
		if (tc.status === "FAILED") row.failed += 1;
		if (tc.startedAt && tc.completedAt) {
			row.latency_sum_ms +=
				tc.completedAt.getTime() - tc.startedAt.getTime();
			row.latency_count += 1;
		}
		toolByName.set(tc.toolName, row);
	}

	const amdMix: Record<string, number> = {};
	let transfers = 0;
	let reschedules = 0;
	let voicemails = 0;
	let endCalls = 0;
	for (const e of events) {
		if (e.eventType === "transfer_started") transfers += 1;
		if (e.eventType === "reschedule_requested") reschedules += 1;
		if (e.eventType === "voicemail_retry_scheduled") voicemails += 1;
		if (e.eventType === "end_call") endCalls += 1;
		if (e.eventType === "amd_result") {
			const payload =
				e.payload &&
				typeof e.payload === "object" &&
				!Array.isArray(e.payload)
					? (e.payload as Record<string, unknown>)
					: {};
			const cat =
				typeof payload.category === "string"
					? payload.category
					: "unknown";
			amdMix[cat] = (amdMix[cat] ?? 0) + 1;
		}
	}

	void sessionFilter;

	return {
		tools: Array.from(toolByName.values()).map((t) => ({
			toolName: t.toolName,
			count: t.count,
			failure_rate: t.count > 0 ? t.failed / t.count : 0,
			avg_latency_ms:
				t.latency_count > 0
					? Math.round(t.latency_sum_ms / t.latency_count)
					: null,
		})),
		transfers,
		reschedules,
		voicemails,
		end_calls: endCalls,
		amd_mix: amdMix,
		tool_call_total: toolCalls.length,
		tool_failure_rate:
			toolCalls.length > 0
				? toolCalls.filter((t) => t.status === "FAILED").length /
					toolCalls.length
				: null,
	};
}

export async function aggregateLatency(opts: {
	organizationId: string;
	since: Date;
	agentId?: string;
}) {
	const events = await db.sessionEvent.findMany({
		where: {
			organizationId: opts.organizationId,
			occurredAt: { gte: opts.since },
			eventType: { startsWith: "agent.metric." },
			...(opts.agentId
				? { session: { agentId: opts.agentId } }
				: {}),
		},
		select: {
			eventType: true,
			payload: true,
			session: { select: { agentId: true } },
		},
	});

	const byType = new Map<string, number[]>();
	for (const e of events) {
		const payload =
			e.payload &&
			typeof e.payload === "object" &&
			!Array.isArray(e.payload)
				? (e.payload as Record<string, unknown>)
				: {};
		const raw =
			payload.duration_ms ??
			payload.ttft_ms ??
			payload.latency_ms ??
			payload.value ??
			payload.ttfb_ms;
		const num =
			typeof raw === "number"
				? raw
				: typeof raw === "string"
					? Number(raw)
					: NaN;
		if (!Number.isFinite(num)) continue;
		const type = e.eventType.replace(/^agent\.metric\./, "");
		const arr = byType.get(type) ?? [];
		arr.push(num);
		byType.set(type, arr);
	}

	const metrics = Array.from(byType.entries()).map(([type, values]) => {
		const sorted = [...values].sort((a, b) => a - b);
		const sum = sorted.reduce((a, b) => a + b, 0);
		return {
			metric: type,
			count: sorted.length,
			avg_ms: sorted.length ? Math.round(sum / sorted.length) : null,
			p50_ms: percentile(sorted, 50),
			p95_ms: percentile(sorted, 95),
		};
	});

	return { metrics };
}

export async function aggregateCampaignAnalytics(opts: {
	organizationId: string;
	campaignId: string;
}) {
	const campaign = await db.campaign.findFirst({
		where: { id: opts.campaignId, organizationId: opts.organizationId },
		include: {
			_count: {
				select: { contacts: true, sessions: true, accessLinks: true },
			},
		},
	});
	if (!campaign) return null;

	const contacts = await db.campaignContact.groupBy({
		by: ["status"],
		where: { campaignId: opts.campaignId },
		_count: { _all: true },
		_avg: { attemptCount: true },
	});

	const outcomes = await db.campaignContact.groupBy({
		by: ["lastOutcome"],
		where: {
			campaignId: opts.campaignId,
			lastOutcome: { not: null },
		},
		_count: { _all: true },
	});

	const consent = await db.campaignContact.count({
		where: { campaignId: opts.campaignId, consentGiven: true },
	});
	const dnc = await db.campaignContact.count({
		where: { campaignId: opts.campaignId, doNotContact: true },
	});
	const totalContacts = campaign._count.contacts;

	const accessLinks = await db.campaignAccessLink.findMany({
		where: { campaignId: opts.campaignId },
		select: {
			id: true,
			label: true,
			kind: true,
			useCount: true,
			maxUses: true,
			enabled: true,
			expiresAt: true,
		},
	});

	const callbacks = await db.callbackSchedule.groupBy({
		by: ["status"],
		where: { campaignId: opts.campaignId },
		_count: { _all: true },
	});

	const activeNow = await db.campaignSession.count({
		where: {
			campaignId: opts.campaignId,
			status: { in: ["QUEUED", "STARTED", "IN_PROGRESS"] },
		},
	});

	const sessionOutcomes = await db.campaignSession.groupBy({
		by: ["outcome"],
		where: { campaignId: opts.campaignId, outcome: { not: null } },
		_count: { _all: true },
	});

	return {
		campaign: {
			id: campaign.id,
			name: campaign.name,
			status: campaign.status,
			maxConcurrentSessions: campaign.maxConcurrentSessions,
			maxAttemptsPerContact: campaign.maxAttemptsPerContact,
		},
		funnel: {
			total_contacts: totalContacts,
			by_status: Object.fromEntries(
				contacts.map((c) => [c.status, c._count._all]),
			),
			avg_attempts:
				contacts.reduce(
					(s, c) => s + (c._avg.attemptCount ?? 0) * c._count._all,
					0,
				) / (totalContacts || 1),
			consent_rate: totalContacts > 0 ? consent / totalContacts : null,
			dnc_count: dnc,
			completion_rate:
				totalContacts > 0
					? (contacts.find((c) => c.status === "COMPLETED")?._count
							._all ?? 0) / totalContacts
					: null,
		},
		outcomes: Object.fromEntries(
			outcomes
				.filter((o) => o.lastOutcome)
				.map((o) => [o.lastOutcome as string, o._count._all]),
		),
		session_outcomes: Object.fromEntries(
			sessionOutcomes
				.filter((o) => o.outcome)
				.map((o) => [o.outcome as string, o._count._all]),
		),
		access_links: accessLinks,
		callbacks: Object.fromEntries(
			callbacks.map((c) => [c.status, c._count._all]),
		),
		concurrency: {
			active_now: activeNow,
			max: campaign.maxConcurrentSessions,
			utilization:
				campaign.maxConcurrentSessions > 0
					? activeNow / campaign.maxConcurrentSessions
					: null,
		},
		totals: {
			contacts: totalContacts,
			sessions: campaign._count.sessions,
			access_links: campaign._count.accessLinks,
		},
	};
}
