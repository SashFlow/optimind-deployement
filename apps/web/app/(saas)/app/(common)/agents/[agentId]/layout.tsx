import { AgentWorkspaceLayout } from "@saas/agents/AgentWorkspaceLayout";
import type { PropsWithChildren } from "react";

export default async function AgentLayout({
	children,
	params,
}: PropsWithChildren<{
	params: Promise<{ agentId: string }>;
}>) {
	const { agentId } = await params;
	return (
		<AgentWorkspaceLayout agentId={agentId}>{children}</AgentWorkspaceLayout>
	);
}
