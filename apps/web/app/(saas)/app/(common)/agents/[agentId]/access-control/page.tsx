"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useParams } from "next/navigation";
import { AgentAccessControlForm } from "@/components/saas/agents/AgentAccessControlForm";

export default function AgentAccessControlPage() {
	const params = useParams<{ agentId: string }>();
	const { activeOrganization } = useActiveOrganization();
	const activeOrganizationId = activeOrganization?.id;

	if (!activeOrganizationId) {
		return (
			<p className="p-6 text-sm text-muted-foreground">
				Select an organization.
			</p>
		);
	}

	return (
		<div className="mx-auto w-full max-w-[1600px] px-5 py-6 md:px-6">
			<AgentAccessControlForm
				agentId={params.agentId}
				organizationId={activeOrganizationId}
			/>
		</div>
	);
}
