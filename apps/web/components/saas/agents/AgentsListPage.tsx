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
import { AudioWaveformIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";

export function AgentsListPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id ?? "";

	const agentsQuery = useQuery({
		...orpc.agents.list.queryOptions({
			input: { organizationId },
		}),
		enabled: !!organizationId,
	});

	const listQueryKey = orpc.agents.list.key({
		input: { organizationId },
	});

	const createMutation = useMutation(
		orpc.agents.create.mutationOptions({
			onSuccess: async (data) => {
				await queryClient.invalidateQueries({
					queryKey: listQueryKey,
				});
				toast.success("Agent created");
				router.push(`/app/agents/${data.agent.id}`);
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create agent");
			},
		}),
	);

	const updateMutation = useMutation(
		orpc.agents.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: listQueryKey,
				});
				toast.success("Agent updated");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update agent");
			},
		}),
	);

	const deleteMutation = useMutation(
		orpc.agents.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: listQueryKey,
				});
				toast.success("Agent deleted");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to delete agent");
			},
		}),
	);

	const agents = agentsQuery.data?.agents ?? [];
	const isLoading = !organizationId || agentsQuery.isPending;

	const createDialog = (
		<ResourceCreateDialog
			title="Create agent"
			description="Add a new voice agent to this organization."
			namePlaceholder="Support agent"
			descriptionPlaceholder="What should this agent handle?"
			submitLabel="Create agent"
			loading={createMutation.isPending}
			trigger={
				<button type="button">
					<PlusIcon className="size-4" />
					Create
				</button>
			}
			onCreate={async (name, description) => {
				if (!organizationId) return;
				await createMutation.mutateAsync({
					organizationId,
					name,
					description: description || undefined,
				});
			}}
		/>
	);

	return (
		<FolderTabs defaultValue="agents" className="h-full">
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="agents">Agents</FolderTabsTrigger>
				</FolderTabsList>
				<FolderTabsActions>{createDialog}</FolderTabsActions>
			</FolderTabsBar>
			<FolderTabsContent value="agents">
				<ResourcePage
					isLoading={isLoading}
					items={agents.map((agent) => ({
						id: agent.id,
						title: agent.name,
						description: agent.description ?? "",
						status:
							agent.status === "ACTIVE" ? "Active" : "Inactive",
						meta: new Date(agent.updatedAt).toLocaleDateString(),
						icon: <AudioWaveformIcon className="size-4" />,
						href: `/app/agents/${agent.id}`,
						onEdit: async (name, description) => {
							await updateMutation.mutateAsync({
								id: agent.id,
								name,
								description: description || null,
							});
						},
						onDelete: async () => {
							await deleteMutation.mutateAsync({
								id: agent.id,
								status: "DELETED",
							});
						},
					}))}
					searchPlaceholder="Search agents"
					empty={{
						icon: <AudioWaveformIcon className="size-8" />,
						title: "No agents yet",
						description:
							"Create your first agent to start taking calls.",
					}}
				/>
			</FolderTabsContent>
		</FolderTabs>
	);
}
