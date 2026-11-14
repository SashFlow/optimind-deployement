"use client";

import {
	FolderTabs,
	FolderTabsBack,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { useEffect, useState } from "react";
import AgentAccessControlPage from "@/components/saas/agents/AgentAccessControlPage";
import AgentConfigurePage from "@/components/saas/agents/AgentConfigurePage";
import AgentLogsPage from "@/components/saas/agents/AgentLogsPage";
import AgentMonitorPage from "@/components/saas/agents/AgentMonitorPage";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";

export default function AgentDetailLayout() {
	const [tab, setTab] = useState("dashboard");
	const { activeOrganizationUserRole } = useActiveOrganization();
	const canEditAgent = activeOrganizationUserRole !== "member";
	const canManageAccessControl = canEditAgent;

	useEffect(() => {
		if (!canManageAccessControl && tab === "access-control") {
			setTab("dashboard");
		}
	}, [canManageAccessControl, tab]);

	return (
		<FolderTabs
			value={tab}
			onValueChange={setTab}
			className="min-h-0 flex-1"
		>
			<FolderTabsBar>
				<FolderTabsBack href="/app/agents" />
				<FolderTabsList>
					<FolderTabsTrigger value="dashboard">
						Dashboard
					</FolderTabsTrigger>
					<FolderTabsTrigger value="configure">
						Agent
					</FolderTabsTrigger>
					<FolderTabsTrigger value="sessions">
						Sessions
					</FolderTabsTrigger>
					{canManageAccessControl ? (
						<FolderTabsTrigger value="access-control">
							Access Control
						</FolderTabsTrigger>
					) : null}
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="configure" scrollable={false}>
				<AgentConfigurePage />
			</FolderTabsContent>
			<FolderTabsContent value="dashboard">
				<AgentMonitorPage
					onEditAgent={
						canEditAgent ? () => setTab("configure") : undefined
					}
				/>
			</FolderTabsContent>
			<FolderTabsContent value="sessions" scrollable={false}>
				<AgentLogsPage />
			</FolderTabsContent>
			{canManageAccessControl ? (
				<FolderTabsContent
					value="access-control"
					scrollable={false}
					className="p-0"
				>
					<AgentAccessControlPage />
				</FolderTabsContent>
			) : null}
		</FolderTabs>
	);
}
