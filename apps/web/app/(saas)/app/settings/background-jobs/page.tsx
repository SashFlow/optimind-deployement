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
import { MemberPermissionEmpty } from "@/components/saas/shared/MemberPermissionEmpty";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";

export default function BackgroundJobsPage() {
	const { activeOrganizationUserRole } = useActiveOrganization();
	const canViewBackgroundJobs = activeOrganizationUserRole !== "member";

	if (!canViewBackgroundJobs) {
		return (
			<MemberPermissionEmpty
				title="You don't have permissions to view background jobs"
				description="Background jobs are managed by organization owners and admins. Ask one of them if you need access."
			/>
		);
	}

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
