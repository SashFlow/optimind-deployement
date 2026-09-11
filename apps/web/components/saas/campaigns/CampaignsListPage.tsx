"use client";

import { ResourceCreateDialog } from "@saas/app/ResourceCreateDialog";
import { ResourcePage } from "@saas/app/ResourcePage";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SendHorizonalIcon } from "lucide-react";
import { toast } from "sonner";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";

export function CampaignsListPage() {
	const queryClient = useQueryClient();
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id ?? "";

	const query = useQuery({
		...orpc.campaigns.list.queryOptions({
			input: { organizationId },
		}),
		enabled: !!organizationId,
	});

	const agentsQuery = useQuery({
		...orpc.agents.list.queryOptions({
			input: { organizationId },
		}),
		enabled: !!organizationId,
	});

	const listQueryKey = orpc.campaigns.list.key({
		input: { organizationId },
	});

	const createMutation = useMutation(
		orpc.campaigns.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: listQueryKey,
				});
				toast.success("Campaign created");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateMutation = useMutation(
		orpc.campaigns.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: listQueryKey,
				});
				toast.success("Campaign updated");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteMutation = useMutation(
		orpc.campaigns.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: listQueryKey,
				});
				toast.success("Campaign deleted");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const campaigns = query.data?.campaigns ?? [];
	const defaultAgentId = agentsQuery.data?.agents[0]?.id;
	const isLoading = !organizationId || query.isPending;

	return (
		<ResourcePage
			isLoading={isLoading}
			items={campaigns.map((campaign) => ({
				id: campaign.id,
				title: campaign.name,
				description: campaign.description ?? "",
				status: String(campaign.status ?? "Draft"),
				meta: new Date(campaign.updatedAt).toLocaleDateString(),
				icon: <SendHorizonalIcon className="size-4" />,
				href: `/app/campaigns/${campaign.id}`,
				onEdit: async (name, description) => {
					await updateMutation.mutateAsync({
						id: campaign.id,
						name,
						description: description || null,
					});
				},
				onDelete: async () => {
					await deleteMutation.mutateAsync({
						id: campaign.id,
						status: "ARCHIVED",
					});
				},
			}))}
			searchPlaceholder="Search campaigns"
			createAction={
				<ResourceCreateDialog
					title="Create campaign"
					description={
						defaultAgentId
							? "Start an outbound voice campaign with your first agent."
							: "Create an agent first, then add a campaign."
					}
					namePlaceholder="Q2 outreach"
					descriptionPlaceholder="Optional description"
					submitLabel="Create campaign"
					loading={createMutation.isPending}
					onCreate={async (name, description) => {
						if (!organizationId || !defaultAgentId) {
							toast.error(
								"Create an agent before starting a campaign",
							);
							return;
						}
						await createMutation.mutateAsync({
							organizationId,
							agentId: defaultAgentId,
							name,
							description: description || undefined,
							mode: "OUTBOUND_LIST",
							channel: "VOICE",
						});
					}}
				/>
			}
			empty={{
				icon: <SendHorizonalIcon className="size-8" />,
				title: "No campaigns",
				description:
					"Create a campaign to dial contacts with an agent.",
			}}
		/>
	);
}
