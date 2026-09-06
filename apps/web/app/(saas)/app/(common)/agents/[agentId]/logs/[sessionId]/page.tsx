"use client";

import { useParams } from "next/navigation";
import { AgentSessionDetail } from "@/components/saas/agents/AgentSessionDetail";

export default function AgentSessionPage() {
	const params = useParams<{ agentId: string; sessionId: string }>();

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<AgentSessionDetail
				agentId={params.agentId}
				sessionId={params.sessionId}
			/>
		</div>
	);
}
