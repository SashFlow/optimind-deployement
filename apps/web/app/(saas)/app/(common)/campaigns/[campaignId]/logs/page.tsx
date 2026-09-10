"use client";

import { CampaignWorkflowLogs } from "@saas/campaigns/CampaignWorkflowLogs";
import { useParams } from "next/navigation";

export default function CampaignLogsPage() {
	const params = useParams<{ campaignId: string }>();
	return <CampaignWorkflowLogs campaignId={params.campaignId} />;
}
