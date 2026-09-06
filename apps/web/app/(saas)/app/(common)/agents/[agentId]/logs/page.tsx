"use client";

import { useParams } from "next/navigation";
import { AgentSessionsTable } from "@/components/saas/agents/AgentSessionsTable";
import { useAgentSessionsQuery } from "@/components/saas/agents/lib/hooks";

export default function AgentLogsPage() {
	const params = useParams<{ agentId: string }>();
	const sessionsQuery = useAgentSessionsQuery(params.agentId);

	return (
		<AgentSessionsTable
			sessions={sessionsQuery.data ?? []}
			agentId={params.agentId}
			isLoading={sessionsQuery.isLoading}
			isError={sessionsQuery.isError}
		/>
	);
}
