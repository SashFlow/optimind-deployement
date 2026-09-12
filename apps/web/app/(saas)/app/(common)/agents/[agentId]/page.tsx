"use client";
import {
	FolderTabs,
	FolderTabsBack,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import AgentAccessControlPage from "@/components/saas/agents/AgentAccessControlPage";
import AgentConfigurePage from "@/components/saas/agents/AgentConfigurePage";
import AgentLogsPage from "@/components/saas/agents/AgentLogsPage";
import AgentMonitorPage from "@/components/saas/agents/AgentMonitorPage";

export default function AgentDetailLayout() {
	return (
		<FolderTabs defaultValue="dashboard" className="min-h-0 flex-1">
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

					<FolderTabsTrigger value="access-control">
						Access Control
					</FolderTabsTrigger>
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="configure">
				<AgentConfigurePage />
			</FolderTabsContent>
			<FolderTabsContent value="dashboard">
				<AgentMonitorPage />
			</FolderTabsContent>
			<FolderTabsContent value="sessions" scrollable={false}>
				<AgentLogsPage />
			</FolderTabsContent>
			<FolderTabsContent value="access-control">
				<AgentAccessControlPage />
			</FolderTabsContent>
		</FolderTabs>
	);
}
