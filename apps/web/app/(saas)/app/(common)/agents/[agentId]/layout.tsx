"use client";

import { AgentWorkspaceLayout } from "@saas/agents/AgentWorkspaceLayout";
import { useParams } from "next/navigation";
import type { PropsWithChildren } from "react";

export default function AgentDetailLayout({ children }: PropsWithChildren) {
	const params = useParams<{ agentId: string }>();
	const agentId = params.agentId;

	return (
		<AgentWorkspaceLayout agentId={agentId}>{children}</AgentWorkspaceLayout>
	);
}
