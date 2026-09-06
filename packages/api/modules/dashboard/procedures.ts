import { db } from "@repo/database";
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

export const stats = protectedProcedure
	.route({
		method: "GET",
		path: "/dashboard/stats",
		tags: ["Dashboard"],
		summary: "Organization dashboard session stats",
	})
	.input(
		z.object({
			organizationId: z.string(),
			days: z.number().int().min(1).max(90).default(30),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		const since = new Date();
		since.setDate(since.getDate() - input.days);

		const sessions = await db.agentSession.findMany({
			where: {
				organizationId: input.organizationId,
				createdAt: { gte: since },
			},
			select: {
				status: true,
				channel: true,
				durationMs: true,
				createdAt: true,
			},
		});

		const activeStatuses = new Set(["QUEUED", "ACTIVE"]);
		const completed = sessions.filter((s) => s.status === "COMPLETED");
		const failed = sessions.filter((s) => s.status === "FAILED");
		const durations = sessions
			.map((s) => s.durationMs)
			.filter((ms): ms is number => typeof ms === "number" && ms > 0);
		const totalDuration = durations.reduce((sum, ms) => sum + ms, 0);

		const dailyMap = emptyDailyMap(input.days);
		const byChannel: Record<string, number> = {};

		for (const session of sessions) {
			const key = session.createdAt.toISOString().slice(0, 10);
			const bucket = dailyMap.get(key);
			if (bucket) {
				bucket.count += 1;
				if (session.status === "COMPLETED") bucket.completed += 1;
				if (session.status === "FAILED") bucket.failed += 1;
			}
			const channel = session.channel ?? "WEB";
			byChannel[channel] = (byChannel[channel] ?? 0) + 1;
		}

		const failureRate =
			sessions.length > 0 ? failed.length / sessions.length : null;

		return {
			stats: {
				total_sessions: sessions.length,
				active_sessions: sessions.filter((s) =>
					activeStatuses.has(s.status),
				).length,
				completed_sessions: completed.length,
				avg_duration_ms:
					durations.length > 0
						? Math.round(totalDuration / durations.length)
						: null,
				failure_rate: failureRate,
				daily: Array.from(dailyMap.values()),
				by_channel: byChannel,
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
				const sipBucket = sipMap.get(date);
				if (sipBucket) sipBucket.count += 1;
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

		for (const job of egressJobs) {
			totalEgress += 1;
			const duration = job.durationMs ?? 0;
			totalBillable += duration;
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
				},
				egress: {
					by_type_daily: Array.from(egressMap.values()),
					total_count: totalEgress,
					total_billable_duration_ms: totalBillable,
					total_track_duration_ms: totalTrack,
				},
			},
		};
	});
