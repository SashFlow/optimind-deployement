"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
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
	});
}
