import {
	FolderTabs,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { Dashboard } from "@saas/app/Dashboard";

export default function DashboardPage() {
	return (
		<FolderTabs defaultValue="dashboard" className="h-full">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="dashboard">
						Dashboard
					</FolderTabsTrigger>
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="dashboard" scrollable>
				<Dashboard />
			</FolderTabsContent>
		</FolderTabs>
	);
}
