"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type AgentSessionRow, computeAgentStats, mapSession } from "./types";

export function useAgentSessionsQuery(
	agentId: string | null | undefined,
	options?: { refetchInterval?: number },
) {
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id;

	return useQuery({
		...orpc.sessions.list.queryOptions({
			input: {
				organizationId: organizationId ?? "",
				agentId: agentId ?? undefined,
				take: 100,
			},
		}),
		enabled: !!organizationId,
		refetchInterval: options?.refetchInterval,
		select: (data): AgentSessionRow[] =>
			(data?.sessions ?? []).map(mapSession),
	});
}

export function useOrgSessionsQuery(options?: { refetchInterval?: number }) {
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id;

	return useQuery({
		...orpc.sessions.list.queryOptions({
			input: {
				organizationId: organizationId ?? "",
				take: 100,
			},
		}),
		enabled: !!organizationId,
		refetchInterval: options?.refetchInterval,
		select: (data): AgentSessionRow[] =>
			(data?.sessions ?? []).map(mapSession),
	});
}

export function useAgentStatsQuery(agentId: string | null | undefined) {
	const sessionsQuery = useAgentSessionsQuery(agentId);
	return {
		...sessionsQuery,
		data: sessionsQuery.data
			? computeAgentStats(sessionsQuery.data)
			: undefined,
	};
}

export function useSessionDetailQuery(sessionId: string | null | undefined) {
	return useQuery({
		...orpc.sessions.get.queryOptions({
			input: { id: sessionId ?? "" },
		}),
		enabled: !!sessionId,
		refetchInterval: (query) => {
			const status = query.state.data?.session?.status?.toUpperCase();
			const egressJobs = query.state.data?.session?.egressJobs ?? [];
			const egressOpen = egressJobs.some((job: { status?: string }) => {
				const value = job.status?.toUpperCase();
				return (
					value === "ACTIVE" ||
					value === "ENDING" ||
					value === "STARTING"
				);
			});
			if (status === "ACTIVE" || status === "QUEUED" || egressOpen) {
				return 5_000;
			}
			return false;
		},
	});
}

export function useEndSessionMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.sessions.end.mutationOptions({
			onSuccess: async (_data, variables) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.sessions.list.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.sessions.get.key({
							input: { id: variables.id },
						}),
					}),
				]);
				toast.success("Session ended");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to end session");
			},
		}),
	);
}
