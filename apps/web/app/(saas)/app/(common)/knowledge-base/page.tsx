import {
	FolderTabs,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { KnowledgeListPage } from "@saas/knowledge/KnowledgeListPage";

export default function KnowledgeBasePage() {
	return (
		<FolderTabs defaultValue="knowledge-base" className="h-full">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="knowledge-base">
						Knowledge Base
					</FolderTabsTrigger>
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="knowledge-base">
				<KnowledgeListPage />
			</FolderTabsContent>
		</FolderTabs>
	);
}
