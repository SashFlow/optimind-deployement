import {
	FolderTabs,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import AuditLogsPageContent from "@/components/saas/audit-logs/AuditLogs";

export default function AuditLogsPage() {
	return (
		<FolderTabs defaultValue="audit-logs" className="min-h-0 flex-1">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="audit-logs">
						Audit Logs
					</FolderTabsTrigger>
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="audit-logs">
				<AuditLogsPageContent />
			</FolderTabsContent>
		</FolderTabs>
	);
}
