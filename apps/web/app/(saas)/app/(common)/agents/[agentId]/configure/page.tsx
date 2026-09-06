import { AgentConfigurePage } from "@saas/agents/AgentConfigurePage";

export default async function Page({
	params,
}: {
	params: Promise<{ agentId: string }>;
}) {
	const { agentId } = await params;
	return <AgentConfigurePage agentId={agentId} />;
}
