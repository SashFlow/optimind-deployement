"use client";

import { ResourceCreateDialog } from "@saas/app/ResourceCreateDialog";
import { ResourcePage } from "@saas/app/ResourcePage";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookTextIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function KnowledgeListPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id ?? "";

	const query = useQuery({
		...orpc.knowledge.list.queryOptions({
			input: { organizationId },
		}),
		enabled: !!organizationId,
	});

	const createMutation = useMutation(
		orpc.knowledge.create.mutationOptions({
			onSuccess: async (data) => {
				await queryClient.invalidateQueries({
					queryKey: orpc.knowledge.list.key({
						input: { organizationId },
					}),
				});
				toast.success("Knowledge base created");
				router.push(`/app/knowledge-base/${data.knowledgeBase.id}`);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const items = query.data?.knowledgeBases ?? [];

	return (
		<ResourcePage
			filters={[
				{ label: "All", value: "all", count: items.length },
			]}
			items={items.map((kb) => ({
				id: kb.id,
				title: kb.name,
				description: kb.description ?? "No description",
				status: "Active",
				filterKey: "all",
				meta: new Date(kb.updatedAt).toLocaleDateString(),
				icon: <BookTextIcon className="size-4" />,
				href: `/app/knowledge-base/${kb.id}`,
			}))}
			searchPlaceholder="Search knowledge bases"
			createAction={
				<ResourceCreateDialog
					title="Create knowledge base"
					description="Add a knowledge base for agents to search."
					namePlaceholder="Product FAQ"
					descriptionPlaceholder="Optional description"
					submitLabel="Create"
					loading={createMutation.isPending}
					onCreate={async (name, description) => {
						if (!organizationId) return;
						await createMutation.mutateAsync({
							organizationId,
							name,
							description: description || undefined,
						});
					}}
				/>
			}
			empty={{
				icon: <BookTextIcon className="size-8" />,
				title: "No knowledge bases",
				description: "Create a knowledge base to ground your agents.",
			}}
		/>
	);
}
