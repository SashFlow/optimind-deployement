import {
	FolderTabs,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import BackgroundJobsPageContent from "@/components/saas/background-jobs/BackgroundJobs";

export default function BackgroundJobsPage() {
	return (
		<FolderTabs defaultValue="background-jobs" className="h-full">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="background-jobs">
						Background Jobs
					</FolderTabsTrigger>
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="background-jobs">
				<BackgroundJobsPageContent />
			</FolderTabsContent>
		</FolderTabs>
	);
}
