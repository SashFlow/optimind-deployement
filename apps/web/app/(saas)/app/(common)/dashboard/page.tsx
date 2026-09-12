import {
	FolderTabs,
	FolderTabsActions,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { Dashboard } from "@saas/app/Dashboard";
import Link from "next/link";

export default function DashboardPage() {
	return (
		<FolderTabs defaultValue="dashboard" className="h-full">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="dashboard">
						Dashboard
					</FolderTabsTrigger>
				</FolderTabsList>
				<FolderTabsActions>
					<Link href="/app/agents">Agents</Link>
				</FolderTabsActions>
			</FolderTabsBar>
			<FolderTabsContent value="dashboard" scrollable>
				<Dashboard />
			</FolderTabsContent>
		</FolderTabs>
	);
}
