import {
	FolderTabs,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { AdminOrganizations } from "@/components/saas/admin/AdminOrganizations";
import { AdminUsers } from "@/components/saas/admin/AdminUsers";
import { getSession } from "@/services/session";

export default async function AdminUsersPage() {
	const session = await getSession();
	const isSuperAdmin = session?.user.role === "admin";

	return (
		<FolderTabs defaultValue="members" className="h-full">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="members">
						Members
					</FolderTabsTrigger>
					{isSuperAdmin && (
						<FolderTabsTrigger value="organizations">
							Organizations
						</FolderTabsTrigger>
					)}
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="members">
				<AdminUsers />
			</FolderTabsContent>
			{isSuperAdmin && (
				<FolderTabsContent value="organizations">
					<AdminOrganizations />
				</FolderTabsContent>
			)}
		</FolderTabs>
	);
}
