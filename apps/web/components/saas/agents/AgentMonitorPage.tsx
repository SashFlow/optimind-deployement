"use client";

import { Button } from "@repo/ui/button";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
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

export default function AgentMonitorPage({
	onEditAgent,
}: {
	onEditAgent?: () => void;
}) {
	const params = useParams<{ agentId: string }>();
	const agentQuery = useQuery(
		orpc.agents.get.queryOptions({ input: { id: params.agentId } }),
	);
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

	const agent = agentQuery.data?.agent;
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
		<div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-6 overflow-y-auto pb-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight text-primary">
						{agent?.name ?? "Agent"}
					</h1>
					<p className="text-sm text-muted-foreground">
						{agent?.description || "Agent dashboard"}
					</p>
				</div>
				{onEditAgent ? (
					<div className="flex items-center gap-2">
						<Button size="sm" onClick={onEditAgent}>
							Edit agent
						</Button>
					</div>
				) : null}
			</div>

			<AgentMonitorBody server={server} chartStats={chartStats} />
			<AgentActiveSessions
				sessions={sessionsQuery.data ?? []}
				agentId={params.agentId}
			/>
		</div>
	);
}
