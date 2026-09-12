"use client";

import {
	FolderTabs,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { SettingsTabActions } from "@/components/saas/admin/SettingsTabActions";
import BackgroundJobsPageContent from "@/components/saas/background-jobs/BackgroundJobs";

export default function BackgroundJobsPage() {
	return (
		<FolderTabs defaultValue="background-jobs" className="min-h-0 flex-1">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="background-jobs">
						Jobs
					</FolderTabsTrigger>
				</FolderTabsList>
				<SettingsTabActions showPlus={false} />
			</FolderTabsBar>
			<FolderTabsContent value="background-jobs">
				<BackgroundJobsPageContent />
			</FolderTabsContent>
		</FolderTabs>
	);
}
