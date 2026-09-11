"use client";

import { useParams } from "next/navigation";
import { AgentAccessControlForm } from "@/components/saas/agents/AgentAccessControlForm";
import { PageSectionSkeleton } from "@/components/saas/shared/skeletons";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";

export default function AgentAccessControlPage() {
	const params = useParams<{ agentId: string }>();
	const { activeOrganization, loaded } = useActiveOrganization();
	const activeOrganizationId = activeOrganization?.id;

	if (!loaded) {
		return <PageSectionSkeleton />;
	}

	if (!activeOrganizationId) {
		return (
			<p className="p-6 text-sm text-muted-foreground">
				Select an organization.
			</p>
		);
	}

	return (
		<div className="mx-auto w-full max-w-[1600px] px-5 py-6 md:px-6">
			<AgentAccessControlForm agentId={params.agentId} />
		</div>
	);
}
