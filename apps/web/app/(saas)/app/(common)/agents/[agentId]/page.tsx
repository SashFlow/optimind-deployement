import { redirect } from "next/navigation";

export default async function AgentDetailPage({
	params,
}: {
	params: Promise<{ agentId: string }>;
}) {
	const { agentId } = await params;
	redirect(`/app/agents/${agentId}/configure`);
}
