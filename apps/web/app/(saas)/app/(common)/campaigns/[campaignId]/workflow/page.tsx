"use client";

import { WorkflowEditor } from "@saas/campaigns/workflow/WorkflowEditor";
import { useParams } from "next/navigation";

export default function CampaignWorkflowPage() {
	const params = useParams<{ campaignId: string }>();
	return <WorkflowEditor campaignId={params.campaignId} />;
}
