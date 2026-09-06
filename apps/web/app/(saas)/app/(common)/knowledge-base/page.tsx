"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { BookOpenIcon, FileTextIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ResourceCreateDialog } from "@/components/saas/app/ResourceCreateDialog";
import {
	type ResourceItem,
	ResourcePage,
} from "@/components/saas/app/ResourcePage";
import {
	useCreateKnowledgeSourceMutation,
	useKnowledgeSourcesQuery,
} from "@/services/api/hooks";

export default function KnowledgeBasePage() {
	const router = useRouter();
	const { activeOrganization } = useActiveOrganization();
	const activeOrganizationId = activeOrganization?.id ?? null;
	const sourcesQuery = useKnowledgeSourcesQuery(activeOrganizationId);
	const createSource = useCreateKnowledgeSourceMutation(
		activeOrganizationId,
		{
			onError: (error) => toast.error(error.message),
		},
	);

	const sources = sourcesQuery.data ?? [];
	const items: ResourceItem[] = sources.map((source) => ({
		id: source.id,
		title: source.name,
		description:
			source.description || "A knowledge source ready to be indexed.",
		status: source.status === "published" ? "Published" : "Draft",
		filterKey: source.status === "published" ? "published" : "drafts",
		owner: "me",
		meta: `${source.document_count} document${source.document_count === 1 ? "" : "s"}`,
		icon: <FileTextIcon className="size-4" />,
		href: `/app/knowledge-base/${source.id}`,
	}));

	const filters = [
		{ label: "All", value: "all", count: items.length },
		{
			label: "Published",
			value: "published",
			count: items.filter((source) => source.filterKey === "published")
				.length,
		},
		{
			label: "Drafts",
			value: "drafts",
			count: items.filter((source) => source.filterKey === "drafts")
				.length,
		},
	];

	async function addSource(name: string, description: string) {
		if (!activeOrganizationId) return;
		const source = await createSource.mutateAsync({
			name,
			description,
		});
		void sourcesQuery.refetch();
		router.push(`/app/knowledge-base/${source.id}`);
	}

	return (
		<ResourcePage
			filters={filters}
			items={items}
			searchPlaceholder="Search knowledge sources..."
			createAction={
				<ResourceCreateDialog
					title="Add knowledge source"
					description="Add a source that agents can use to answer questions."
					nameLabel="Source name"
					namePlaceholder="e.g. Product documentation"
					descriptionPlaceholder="What does this source contain?"
					submitLabel="Add source"
					onCreate={addSource}
				/>
			}
			empty={{
				icon: <BookOpenIcon />,
				title: "No knowledge sources yet",
				description:
					"Add documents and sources to give your agents the right context.",
			}}
		/>
	);
}
