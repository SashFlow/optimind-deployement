"use client";

import {
	FolderTabs,
	FolderTabsActions,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { ResourceCreateDialog } from "@saas/app/ResourceCreateDialog";
import { ResourcePage } from "@saas/app/ResourcePage";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookTextIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";

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

	const listQueryKey = orpc.knowledge.list.key({
		input: { organizationId },
	});

	const createMutation = useMutation(
		orpc.knowledge.create.mutationOptions({
			onSuccess: async (data) => {
				await queryClient.invalidateQueries({
					queryKey: listQueryKey,
				});
				toast.success("Knowledge base created");
				router.push(`/app/knowledge-base/${data.knowledgeBase.id}`);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateMutation = useMutation(
		orpc.knowledge.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: listQueryKey,
				});
				toast.success("Knowledge base updated");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteMutation = useMutation(
		orpc.knowledge.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: listQueryKey,
				});
				toast.success("Knowledge base deleted");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const items = query.data?.knowledgeBases ?? [];
	const isLoading = !organizationId || query.isPending;

	const createDialog = (
		<ResourceCreateDialog
			title="Knowledge"
			description="Add a knowledge base for agents to search."
			namePlaceholder="Product FAQ"
			descriptionPlaceholder="Optional description"
			submitLabel="Knowledge"
			loading={createMutation.isPending}
			trigger={
				<button type="button">
					<PlusIcon className="size-4" />
					Create
				</button>
			}
			onCreate={async (name, description) => {
				if (!organizationId) {
					return;
				}
				await createMutation.mutateAsync({
					organizationId,
					name,
					description: description || undefined,
				});
			}}
		/>
	);

	return (
		<FolderTabs defaultValue="knowledge-base" className="h-full">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="knowledge-base">
						Knowledge Base
					</FolderTabsTrigger>
				</FolderTabsList>
				<FolderTabsActions>{createDialog}</FolderTabsActions>
			</FolderTabsBar>
			<FolderTabsContent value="knowledge-base">
				<ResourcePage
					isLoading={isLoading}
					items={items.map((kb) => ({
						id: kb.id,
						title: kb.name,
						description: kb.description ?? "",
						status: "Active",
						meta: new Date(kb.updatedAt).toLocaleDateString(),
						icon: <BookTextIcon className="size-4" />,
						href: `/app/knowledge-base/${kb.id}`,
						onEdit: async (name, description) => {
							await updateMutation.mutateAsync({
								id: kb.id,
								name,
								description: description || null,
							});
						},
						onDelete: async () => {
							await deleteMutation.mutateAsync({
								id: kb.id,
								status: "DELETED",
							});
						},
					}))}
					searchPlaceholder="Search knowledge bases"
					empty={{
						icon: <BookTextIcon className="size-8" />,
						title: "No knowledge bases",
						description:
							"Create a knowledge base to ground your agents.",
					}}
				/>
			</FolderTabsContent>
		</FolderTabs>
	);
}
