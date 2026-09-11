import {
	FolderTabs,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { AgentsListPage } from "@saas/agents/AgentsListPage";

export default function AgentsPage() {
	return (
		<FolderTabs defaultValue="agents" className="h-full">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="agents">Agents</FolderTabsTrigger>
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="agents">
				<AgentsListPage />
			</FolderTabsContent>
		</FolderTabs>
	);
}
