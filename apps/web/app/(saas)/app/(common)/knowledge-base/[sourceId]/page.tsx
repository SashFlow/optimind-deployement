import { KnowledgeDetailPage } from "@saas/knowledge/KnowledgeDetailPage";

export default async function Page({
	params,
}: {
	params: Promise<{ sourceId: string }>;
}) {
	const { sourceId } = await params;
	return <KnowledgeDetailPage sourceId={sourceId} />;
}
