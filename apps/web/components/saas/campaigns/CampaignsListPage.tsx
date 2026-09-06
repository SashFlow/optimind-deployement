"use client";

import { ResourceCreateDialog } from "@saas/app/ResourceCreateDialog";
import { ResourcePage } from "@saas/app/ResourcePage";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SendHorizonalIcon } from "lucide-react";
import { toast } from "sonner";

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

	const createMutation = useMutation(
		orpc.campaigns.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.campaigns.list.key({
						input: { organizationId },
					}),
				});
				toast.success("Campaign created");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const campaigns = query.data?.campaigns ?? [];
	const defaultAgentId = agentsQuery.data?.agents[0]?.id;

	return (
		<ResourcePage
			filters={[
				{ label: "All", value: "all", count: campaigns.length },
			]}
			items={campaigns.map((campaign) => ({
				id: campaign.id,
				title: campaign.name,
				description: campaign.description ?? "No description",
				status: String(campaign.status ?? "Draft"),
				filterKey: "all",
				meta: new Date(campaign.updatedAt).toLocaleDateString(),
				icon: <SendHorizonalIcon className="size-4" />,
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
							toast.error("Create an agent before starting a campaign");
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
				description: "Create a campaign to dial contacts with an agent.",
			}}
		/>
	);
}
