"use client";

import { useParams } from "next/navigation";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import { AgentActiveSessions } from "@/components/saas/agents/AgentActiveSessions";
import { AgentMonitorBreakdown } from "@/components/saas/agents/AgentMonitorBreakdown";
import { AgentMonitorChart } from "@/components/saas/agents/AgentMonitorChart";
import { AgentMonitorStats } from "@/components/saas/agents/AgentMonitorStats";
import {
	useAgentSessionsQuery,
	useAgentStatsQuery,
} from "@/components/saas/agents/lib/hooks";

export default function AgentMonitorPage() {
	const params = useParams<{ agentId: string }>();
	const statsQuery = useAgentStatsQuery(params.agentId);
	const sessionsQuery = useAgentSessionsQuery(params.agentId, {
		refetchInterval: 10_000,
	});

	if (statsQuery.isLoading || sessionsQuery.isLoading) {
		return <LoadingState size="lg" />;
	}

	if (statsQuery.isError || !statsQuery.data) {
		return (
			<p className="p-6 text-sm text-destructive">
				Failed to load agent stats.
			</p>
		);
	}

	return (
		<div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 py-6 md:px-6">
			<AgentMonitorStats stats={statsQuery.data} />
			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<AgentMonitorChart stats={statsQuery.data} />
				</div>
				<AgentMonitorBreakdown stats={statsQuery.data} />
			</div>
			<AgentActiveSessions
				sessions={sessionsQuery.data ?? []}
				agentId={params.agentId}
			/>
		</div>
	);
}
