"use client";

import { CampaignDashboard } from "@saas/campaigns/CampaignDashboard";
import { useParams } from "next/navigation";

export default function CampaignDashboardPage() {
	const params = useParams<{ campaignId: string }>();
	return <CampaignDashboard campaignId={params.campaignId} />;
}
