"use client";

import {
	FolderTabs,
	FolderTabsBack,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { CampaignApprovals } from "@saas/campaigns/CampaignApprovals";
import { CampaignDashboard } from "@saas/campaigns/CampaignDashboard";
import { CampaignWorkflowLogs } from "@saas/campaigns/CampaignWorkflowLogs";
import { WorkflowEditor } from "@saas/campaigns/workflow/WorkflowEditor";
import { useParams } from "next/navigation";

export default function CampaignDetailPage() {
	const params = useParams<{ campaignId: string }>();
	return (
		<FolderTabs defaultValue="dashboard" className="h-full">
			<FolderTabsBar>
				<FolderTabsBack href="/app/campaigns" />
				<FolderTabsList>
					<FolderTabsTrigger value="dashboard">
						Dashboard
					</FolderTabsTrigger>
					<FolderTabsTrigger value="workflow">
						Workflow
					</FolderTabsTrigger>
					<FolderTabsTrigger value="approvals">
						Approvals
					</FolderTabsTrigger>
					<FolderTabsTrigger value="logs">Logs</FolderTabsTrigger>
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="dashboard">
				<CampaignDashboard campaignId={params.campaignId} />
			</FolderTabsContent>
			<FolderTabsContent
				value="workflow"
				scrollable={false}
				className="p-0!"
			>
				<WorkflowEditor campaignId={params.campaignId} />
			</FolderTabsContent>
			<FolderTabsContent value="approvals" scrollable={false}>
				<CampaignApprovals campaignId={params.campaignId} />
			</FolderTabsContent>
			<FolderTabsContent value="logs" scrollable={false}>
				<CampaignWorkflowLogs campaignId={params.campaignId} />
			</FolderTabsContent>
		</FolderTabs>
	);
}
