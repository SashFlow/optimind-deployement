"use client";

import {
	FolderTabs,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { SettingsTabActions } from "@/components/saas/admin/SettingsTabActions";
import AuditLogsPageContent from "@/components/saas/audit-logs/AuditLogs";
import { MemberPermissionEmpty } from "@/components/saas/shared/MemberPermissionEmpty";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";

export default function AuditLogsPage() {
	const { activeOrganizationUserRole } = useActiveOrganization();
	const canViewAuditLogs = activeOrganizationUserRole !== "member";

	if (!canViewAuditLogs) {
		return (
			<MemberPermissionEmpty
				title="You don't have permissions to view audit logs"
				description="Audit logs are managed by organization owners and admins. Ask one of them if you need access."
			/>
		);
	}

	return (
		<FolderTabs defaultValue="audit-logs" className="min-h-0 flex-1">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="audit-logs">
						Audit Logs
					</FolderTabsTrigger>
				</FolderTabsList>
				<SettingsTabActions showPlus={false} />
			</FolderTabsBar>
			<FolderTabsContent value="audit-logs">
				<AuditLogsPageContent />
			</FolderTabsContent>
		</FolderTabs>
	);
}
