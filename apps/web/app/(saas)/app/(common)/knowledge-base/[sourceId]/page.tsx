"use client";

import { KnowledgeDetailPage } from "@saas/knowledge/KnowledgeDetailPage";
import { useParams } from "next/navigation";

export default function KnowledgeSourcePage() {
	const params = useParams<{ sourceId: string }>();
	return <KnowledgeDetailPage sourceId={params.sourceId} />;
}
