import {
	FolderTabs,
	FolderTabsActions,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { CampaignCreateAction } from "@/components/saas/campaigns/CampaignCreateAction";
import { CampaignsListPage } from "@/components/saas/campaigns/CampaignsListPage";

export default function CampaignsPage() {
	return (
		<FolderTabs defaultValue="campaigns" className="h-full">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="campaigns">
						Campaigns
					</FolderTabsTrigger>
				</FolderTabsList>
				<FolderTabsActions>
					<CampaignCreateAction />
				</FolderTabsActions>
			</FolderTabsBar>
			<FolderTabsContent value="campaigns">
				<CampaignsListPage />
			</FolderTabsContent>
		</FolderTabs>
	);
}
