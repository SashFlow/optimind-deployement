"use client";

import {
	FolderTabs,
	FolderTabsBack,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { KnowledgeDetailPage } from "@saas/knowledge/KnowledgeDetailPage";
import { useParams } from "next/navigation";

export default function KnowledgeBasePage() {
	const params = useParams<{ sourceId: string }>();
	return (
		<FolderTabs defaultValue="knowledge-base" className="min-h-0 flex-1">
			<FolderTabsBar>
				<FolderTabsBack href="/app/knowledge-base" />
				<FolderTabsList>
					<FolderTabsTrigger value="knowledge-base">
						Knowledge Base
					</FolderTabsTrigger>
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="knowledge-base">
				<KnowledgeDetailPage sourceId={params.sourceId} />
			</FolderTabsContent>
		</FolderTabs>
	);
}
