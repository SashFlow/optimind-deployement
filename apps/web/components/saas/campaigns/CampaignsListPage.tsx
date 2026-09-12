"use client";

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

	const listQueryKey = orpc.campaigns.list.key({
		input: { organizationId },
	});

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
			empty={{
				icon: <SendHorizonalIcon className="size-8" />,
				title: "No campaigns",
				description:
					"Create a campaign to dial contacts with an agent.",
			}}
		/>
	);
}
