"use client";

import {
	FolderTabs,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { useState } from "react";
import { AdminOrganizations } from "@/components/saas/admin/AdminOrganizations";
import { AdminUsers } from "@/components/saas/admin/AdminUsers";
import { SettingsTabActions } from "@/components/saas/admin/SettingsTabActions";

export function AdminMembersTabs({ isSuperAdmin }: { isSuperAdmin: boolean }) {
	const [tab, setTab] = useState("members");

	return (
		<FolderTabs
			value={tab}
			onValueChange={setTab}
			className="min-h-0 flex-1"
		>
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="members">
						Members
					</FolderTabsTrigger>
					{isSuperAdmin ? (
						<FolderTabsTrigger value="organizations">
							Organizations
						</FolderTabsTrigger>
					) : null}
				</FolderTabsList>
				<SettingsTabActions />
			</FolderTabsBar>
			<FolderTabsContent value="members">
				{tab === "members" ? (
					<AdminUsers isSuperAdmin={isSuperAdmin} />
				) : null}
			</FolderTabsContent>
			{isSuperAdmin ? (
				<FolderTabsContent value="organizations">
					{tab === "organizations" ? <AdminOrganizations /> : null}
				</FolderTabsContent>
			) : null}
		</FolderTabs>
	);
}
