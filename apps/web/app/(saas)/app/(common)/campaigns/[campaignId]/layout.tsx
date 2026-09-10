"use client";

import { CampaignWorkspaceLayout } from "@saas/campaigns/CampaignWorkspaceLayout";
import { useParams } from "next/navigation";
import type { PropsWithChildren } from "react";

export default function CampaignDetailLayout({ children }: PropsWithChildren) {
	const params = useParams<{ campaignId: string }>();
	return (
		<CampaignWorkspaceLayout campaignId={params.campaignId}>
			{children}
		</CampaignWorkspaceLayout>
	);
}
