"use client";

import { ResourceCreateDialog } from "@saas/app/ResourceCreateDialog";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";

export function CampaignCreateAction() {
	const queryClient = useQueryClient();
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id ?? "";

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

	const defaultAgentId = agentsQuery.data?.agents[0]?.id;

	return (
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
			trigger={
				<button type="button">
					<PlusIcon className="size-4" />
					Create
				</button>
			}
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
	);
}
