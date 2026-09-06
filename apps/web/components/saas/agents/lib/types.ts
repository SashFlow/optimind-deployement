export type SessionStatus =
	| "QUEUED"
	| "ACTIVE"
	| "COMPLETED"
	| "FAILED"
	| "CANCELLED";

export type AgentSessionRow = {
	id: string;
	status: string;
	channel: string;
	livekitRoomName: string;
	startedAt: string | null;
	endedAt: string | null;
	durationMs: number | null;
	createdAt: string;
	agentId: string;
	errorMessage: string | null;
};

export type AgentStats = {
	total_sessions: number;
	active_sessions: number;
	completed_sessions: number;
	failed_sessions: number;
	avg_duration_ms: number | null;
	total_duration_ms: number;
	daily: Array<{
		date: string;
		count: number;
		completed: number;
		failed: number;
	}>;
};

export function mapSession(row: {
	id: string;
	status: string;
	channel?: string | null;
	livekitRoomName: string;
	startedAt?: Date | string | null;
	endedAt?: Date | string | null;
	durationMs?: number | null;
	createdAt: Date | string;
	agentId: string;
	errorMessage?: string | null;
}): AgentSessionRow {
	return {
		id: row.id,
		status: row.status,
		channel: row.channel ?? "WEB",
		livekitRoomName: row.livekitRoomName,
		startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
		endedAt: row.endedAt ? new Date(row.endedAt).toISOString() : null,
		durationMs: row.durationMs ?? null,
		createdAt: new Date(row.createdAt).toISOString(),
		agentId: row.agentId,
		errorMessage: row.errorMessage ?? null,
	};
}

export function computeAgentStats(
	sessions: AgentSessionRow[],
	days = 30,
): AgentStats {
	const active = new Set(["QUEUED", "ACTIVE"]);
	const completed = sessions.filter((s) => s.status === "COMPLETED");
	const failed = sessions.filter((s) => s.status === "FAILED");
	const durations = sessions
		.map((s) => s.durationMs)
		.filter((ms): ms is number => typeof ms === "number" && ms > 0);
	const totalDuration = durations.reduce((sum, ms) => sum + ms, 0);

	const dailyMap = new Map<
		string,
		{ date: string; count: number; completed: number; failed: number }
	>();
	const now = new Date();
	for (let i = days - 1; i >= 0; i -= 1) {
		const d = new Date(now);
		d.setDate(now.getDate() - i);
		const key = d.toISOString().slice(0, 10);
		dailyMap.set(key, { date: key, count: 0, completed: 0, failed: 0 });
	}
	for (const session of sessions) {
		const key = session.createdAt.slice(0, 10);
		const bucket = dailyMap.get(key);
		if (!bucket) continue;
		bucket.count += 1;
		if (session.status === "COMPLETED") bucket.completed += 1;
		if (session.status === "FAILED") bucket.failed += 1;
	}

	return {
		total_sessions: sessions.length,
		active_sessions: sessions.filter((s) => active.has(s.status)).length,
		completed_sessions: completed.length,
		failed_sessions: failed.length,
		avg_duration_ms:
			durations.length > 0
				? Math.round(totalDuration / durations.length)
				: null,
		total_duration_ms: totalDuration,
		daily: Array.from(dailyMap.values()),
	};
}
