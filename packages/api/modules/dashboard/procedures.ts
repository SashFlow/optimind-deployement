import {
	aggregateActions,
	aggregateCost,
	aggregateLatency,
	aggregateQuality,
	aggregateSessionStats,
	aggregateUsage,
	db,
	listSessionCollectedFields,
} from "@repo/database";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";

function dateKeys(days: number) {
	const keys: string[] = [];
	const now = new Date();
	for (let i = days - 1; i >= 0; i -= 1) {
		const d = new Date(now);
		d.setDate(now.getDate() - i);
		keys.push(d.toISOString().slice(0, 10));
	}
	return keys;
}

function emptyDailyMap(days: number) {
	return new Map(
		dateKeys(days).map((date) => [
			date,
			{ date, count: 0, completed: 0, failed: 0 },
		]),
	);
}

const orgDaysInput = z.object({
	organizationId: z.string(),
	days: z.number().int().min(1).max(90).default(30),
	agentId: z.string().optional(),
});

export const stats = protectedProcedure
	.route({
		method: "GET",
		path: "/dashboard/stats",
		tags: ["Dashboard"],
		summary: "Organization dashboard session stats",
	})
	.input(orgDaysInput)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		const since = new Date();
		since.setDate(since.getDate() - input.days);

		const agg = await aggregateSessionStats({
			organizationId: input.organizationId,
			since,
			agentId: input.agentId,
		});

		const dailyMap = emptyDailyMap(input.days);
		for (const session of agg.sessions) {
			const key = session.createdAt.toISOString().slice(0, 10);
			const bucket = dailyMap.get(key);
			if (bucket) {
				bucket.count += 1;
				if (session.status === "COMPLETED") bucket.completed += 1;
				if (session.status === "FAILED") bucket.failed += 1;
			}
		}

		const failures = agg.sessions
			.filter((s) => s.status === "FAILED")
			.slice(0, 25)
			.map((s) => ({
				id: s.id,
				agentId: s.agentId,
				agentName: s.agent.name,
				errorCode: s.errorCode,
				errorMessage: s.errorMessage,
				endReason: s.endReason,
				createdAt: s.createdAt,
			}));

		return {
			stats: {
				...agg.totals,
				daily: Array.from(dailyMap.values()),
				by_channel: agg.by_channel,
				by_direction: agg.by_direction,
				by_end_reason: agg.by_end_reason,
				by_agent: agg.by_agent,
				failures,
			},
		};
	});

export const analytics = protectedProcedure
	.route({
		method: "GET",
		path: "/dashboard/analytics",
		tags: ["Dashboard"],
		summary: "Organization usage analytics",
	})
	.input(
		z.object({
			organizationId: z.string(),
			days: z.number().int().min(1).max(30).default(7),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		const since = new Date();
		since.setDate(since.getDate() - input.days);
		const keys = dateKeys(input.days);

		const sessions = await db.agentSession.findMany({
			where: {
				organizationId: input.organizationId,
				createdAt: { gte: since },
			},
			select: {
				channel: true,
				direction: true,
				durationMs: true,
				createdAt: true,
				fromNumber: true,
				toNumber: true,
				sipTrunkId: true,
				connectedAt: true,
				status: true,
			},
		});

		const egressJobs = await db.egressJob.findMany({
			where: {
				organizationId: input.organizationId,
				createdAt: { gte: since },
			},
			select: {
				type: true,
				createdAt: true,
				durationMs: true,
				sizeBytes: true,
				status: true,
				errorMessage: true,
			},
		});

		const minutesDaily = keys.map((date) => ({
			date,
			inbound_ms: 0,
			outbound_ms: 0,
			total_ms: 0,
		}));
		const sipDaily = keys.map((date) => ({ date, count: 0 }));
		const minutesMap = new Map(minutesDaily.map((d) => [d.date, d]));
		const sipMap = new Map(sipDaily.map((d) => [d.date, d]));

		let totalInbound = 0;
		let totalOutbound = 0;
		let sipTotal = 0;
		let connected = 0;
		let attempted = 0;

		const numberStats = new Map<
			string,
			{
				number: string;
				attempts: number;
				connects: number;
				duration_ms: number;
			}
		>();
		const trunkStats = new Map<
			string,
			{
				trunkId: string;
				count: number;
				failed: number;
				duration_ms: number;
			}
		>();

		for (const session of sessions) {
			const date = session.createdAt.toISOString().slice(0, 10);
			const duration = session.durationMs ?? 0;
			const bucket = minutesMap.get(date);
			if (bucket) {
				bucket.total_ms += duration;
				if (session.direction === "INBOUND") {
					bucket.inbound_ms += duration;
					totalInbound += duration;
				} else if (session.direction === "OUTBOUND") {
					bucket.outbound_ms += duration;
					totalOutbound += duration;
				}
			}
			if (session.channel === "SIP" || session.channel === "PHONE") {
				sipTotal += 1;
				attempted += 1;
				if (session.connectedAt) connected += 1;
				const sipBucket = sipMap.get(date);
				if (sipBucket) sipBucket.count += 1;

				for (const num of [session.fromNumber, session.toNumber]) {
					if (!num) continue;
					const n = numberStats.get(num) ?? {
						number: num,
						attempts: 0,
						connects: 0,
						duration_ms: 0,
					};
					n.attempts += 1;
					if (session.connectedAt) n.connects += 1;
					n.duration_ms += duration;
					numberStats.set(num, n);
				}
				if (session.sipTrunkId) {
					const t = trunkStats.get(session.sipTrunkId) ?? {
						trunkId: session.sipTrunkId,
						count: 0,
						failed: 0,
						duration_ms: 0,
					};
					t.count += 1;
					if (session.status === "FAILED") t.failed += 1;
					t.duration_ms += duration;
					trunkStats.set(session.sipTrunkId, t);
				}
			}
		}

		const egressDaily = keys.map((date) => ({
			date,
			participant: 0,
			room_composite: 0,
			track: 0,
			web: 0,
		}));
		const egressMap = new Map(egressDaily.map((d) => [d.date, d]));
		let totalEgress = 0;
		let totalBillable = 0;
		let totalTrack = 0;
		let egressFailed = 0;
		let totalBytes = 0;

		for (const job of egressJobs) {
			totalEgress += 1;
			const duration = job.durationMs ?? 0;
			totalBillable += duration;
			totalBytes += job.sizeBytes ?? 0;
			if (job.status === "FAILED" || job.status === "ABORTED") {
				egressFailed += 1;
			}
			const date = job.createdAt.toISOString().slice(0, 10);
			const bucket = egressMap.get(date);
			const type = String(job.type ?? "").toUpperCase();
			if (type.includes("TRACK")) totalTrack += duration;
			if (!bucket) continue;
			if (type.includes("PARTICIPANT")) bucket.participant += 1;
			else if (type.includes("ROOM")) bucket.room_composite += 1;
			else if (type.includes("TRACK")) bucket.track += 1;
			else if (type.includes("WEB")) bucket.web += 1;
			else bucket.room_composite += 1;
		}

		return {
			analytics: {
				livekit: {
					available: false,
					message:
						"LiveKit Cloud analytics are not configured for this environment yet.",
					connection_success_pct: null,
					platforms: [],
					connection_types: [],
					top_countries: [],
					webrtc_participant_minutes: 0,
					participant_minutes_by_kind: [
						{ label: "WebRTC", minutes: 0 },
						{
							label: "SIP",
							minutes: Math.round(
								(totalInbound + totalOutbound) / 60_000,
							),
						},
					],
					participants_daily: keys.map((date) => ({
						date,
						count: 0,
					})),
					data_transfer_daily: keys.map((date) => ({
						date,
						downstream: 0,
						upstream: 0,
					})),
					total_upstream_bytes: 0,
					total_downstream_bytes: 0,
				},
				telephony: {
					minutes_daily: Array.from(minutesMap.values()),
					sip_sessions_daily: Array.from(sipMap.values()),
					total_inbound_ms: totalInbound,
					total_outbound_ms: totalOutbound,
					sip_sessions_total: sipTotal,
					answer_rate: attempted > 0 ? connected / attempted : null,
					top_numbers: Array.from(numberStats.values())
						.sort((a, b) => b.attempts - a.attempts)
						.slice(0, 20),
					trunks: Array.from(trunkStats.values()),
				},
				egress: {
					by_type_daily: Array.from(egressMap.values()),
					total_count: totalEgress,
					total_billable_duration_ms: totalBillable,
					total_track_duration_ms: totalTrack,
					failure_rate:
						totalEgress > 0 ? egressFailed / totalEgress : null,
					total_bytes: totalBytes,
				},
			},
		};
	});

export const usage = protectedProcedure
	.route({
		method: "GET",
		path: "/dashboard/usage",
		tags: ["Dashboard"],
		summary: "SessionUsage aggregates by modality/provider",
	})
	.input(orgDaysInput)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const since = new Date();
		since.setDate(since.getDate() - input.days);
		const { usages: _u, ...rest } = await aggregateUsage({
			organizationId: input.organizationId,
			since,
			agentId: input.agentId,
		});
		return { usage: rest };
	});

export const cost = protectedProcedure
	.route({
		method: "GET",
		path: "/dashboard/cost",
		tags: ["Dashboard"],
		summary: "Estimated cost from SessionUsage × ProviderRate",
	})
	.input(orgDaysInput)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const since = new Date();
		since.setDate(since.getDate() - input.days);
		const result = await aggregateCost({
			organizationId: input.organizationId,
			since,
			agentId: input.agentId,
		});
		return { cost: result };
	});

export const quality = protectedProcedure
	.route({
		method: "GET",
		path: "/dashboard/quality",
		tags: ["Dashboard"],
		summary: "Transcript / conversation quality aggregates",
	})
	.input(orgDaysInput)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const since = new Date();
		since.setDate(since.getDate() - input.days);
		const result = await aggregateQuality({
			organizationId: input.organizationId,
			since,
			agentId: input.agentId,
		});
		return { quality: result };
	});

export const actions = protectedProcedure
	.route({
		method: "GET",
		path: "/dashboard/actions",
		tags: ["Dashboard"],
		summary: "Tool / AMD / transfer / reschedule action aggregates",
	})
	.input(orgDaysInput)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const since = new Date();
		since.setDate(since.getDate() - input.days);
		const result = await aggregateActions({
			organizationId: input.organizationId,
			since,
			agentId: input.agentId,
		});
		return { actions: result };
	});

export const latency = protectedProcedure
	.route({
		method: "GET",
		path: "/dashboard/latency",
		tags: ["Dashboard"],
		summary: "Agent metric latency percentiles",
	})
	.input(orgDaysInput)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const since = new Date();
		since.setDate(since.getDate() - input.days);
		const result = await aggregateLatency({
			organizationId: input.organizationId,
			since,
			agentId: input.agentId,
		});
		return { latency: result };
	});

export const collectedFields = protectedProcedure
	.route({
		method: "GET",
		path: "/sessions/collected-fields",
		tags: ["Sessions"],
		summary: "List collected data fields across sessions",
	})
	.input(
		z.object({
			organizationId: z.string(),
			sessionId: z.string().optional(),
			agentId: z.string().optional(),
			key: z.string().optional(),
			days: z.number().int().min(1).max(90).default(30),
			limit: z.number().int().min(1).max(500).default(100),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const since = new Date();
		since.setDate(since.getDate() - input.days);
		const fields = await listSessionCollectedFields({
			organizationId: input.organizationId,
			sessionId: input.sessionId,
			agentId: input.agentId,
			key: input.key,
			from: since,
			limit: input.limit,
		});
		return { fields };
	});
