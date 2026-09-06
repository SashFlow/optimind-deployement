"use client";

import { ResourceCreateDialog } from "@saas/app/ResourceCreateDialog";
import { ResourcePage } from "@saas/app/ResourcePage";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioWaveformIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

	const createMutation = useMutation(
		orpc.agents.create.mutationOptions({
			onSuccess: async (data) => {
				await queryClient.invalidateQueries({
					queryKey: orpc.agents.list.key({ input: { organizationId } }),
				});
				toast.success("Agent created");
				router.push(`/app/agents/${data.agent.id}/configure`);
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create agent");
			},
		}),
	);

	const agents = agentsQuery.data?.agents ?? [];
	const activeCount = agents.filter((a) => a.status === "ACTIVE").length;
	const inactiveCount = agents.length - activeCount;

	return (
		<ResourcePage
			filters={[
				{ label: "All", value: "all", count: agents.length },
				{ label: "Active", value: "active", count: activeCount },
				{ label: "Inactive", value: "inactive", count: inactiveCount },
			]}
			items={agents.map((agent) => ({
				id: agent.id,
				title: agent.name,
				description: agent.description ?? "No description",
				status: agent.status === "ACTIVE" ? "Active" : "Inactive",
				filterKey: agent.status === "ACTIVE" ? "active" : "inactive",
				meta: new Date(agent.updatedAt).toLocaleDateString(),
				icon: <AudioWaveformIcon className="size-4" />,
				href: `/app/agents/${agent.id}/configure`,
			}))}
			searchPlaceholder="Search agents"
			createAction={
				<ResourceCreateDialog
					title="Create agent"
					description="Add a new voice agent to this organization."
					namePlaceholder="Support agent"
					descriptionPlaceholder="What should this agent handle?"
					submitLabel="Create agent"
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
				icon: <AudioWaveformIcon className="size-8" />,
				title: "No agents yet",
				description: "Create your first agent to start taking calls.",
			}}
		/>
	);
}
