"use client";

import { useParams } from "next/navigation";
import {
	AgentMonitorBody,
	type AgentMonitorServerStats,
} from "@/components/saas/agents/AgentMonitorStats";
import { AgentActiveSessions } from "@/components/saas/agents/AgentActiveSessions";
import { useAgentSessionsQuery } from "@/components/saas/agents/lib/hooks";
import {
	computeAgentStats,
	type AgentStats,
} from "@/components/saas/agents/lib/types";
import { PageSectionSkeleton } from "@/components/saas/shared/skeletons";
import { useAgentServerStatsQuery } from "@/services/api/hooks";

export default function AgentMonitorPage() {
	const params = useParams<{ agentId: string }>();
	const serverStatsQuery = useAgentServerStatsQuery(params.agentId, 30);
	const sessionsQuery = useAgentSessionsQuery(params.agentId, {
		refetchInterval: 10_000,
	});

	if (serverStatsQuery.isLoading || sessionsQuery.isLoading) {
		return <PageSectionSkeleton variant="monitor" />;
	}

	if (serverStatsQuery.isError || !serverStatsQuery.data) {
		return (
			<p className="p-6 text-sm text-destructive">
				Failed to load agent stats.
			</p>
		);
	}

	const server = serverStatsQuery.data as AgentMonitorServerStats;
	const sessionStats = computeAgentStats(sessionsQuery.data ?? [], 30);
	const chartStats: AgentStats = {
		total_sessions: server.total_sessions,
		active_sessions: server.active_sessions,
		completed_sessions: server.completed_sessions,
		failed_sessions: server.failed_sessions ?? 0,
		avg_duration_ms: server.avg_duration_ms,
		total_duration_ms: sessionStats.total_duration_ms,
		daily: sessionStats.daily,
	};

	return (
		<div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 py-6 md:px-6">
			<AgentMonitorBody server={server} chartStats={chartStats} />
			<AgentActiveSessions
				sessions={sessionsQuery.data ?? []}
				agentId={params.agentId}
			/>
		</div>
	);
}
