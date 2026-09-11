"use client";

import {
	FolderTabs,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { CampaignApprovalDetail } from "@saas/campaigns/CampaignApprovalDetail";
import { useParams } from "next/navigation";

export default function CampaignApprovalTokenPage() {
	const params = useParams<{ campaignId: string; token: string }>();
	return (
		<FolderTabs defaultValue="approval" className="h-full">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="approval">
						Approval
					</FolderTabsTrigger>
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="approval">
				<CampaignApprovalDetail
					campaignId={params.campaignId}
					token={params.token}
				/>
			</FolderTabsContent>
		</FolderTabs>
	);
}
