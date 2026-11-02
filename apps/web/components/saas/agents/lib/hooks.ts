"use client";

import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
	EgressJobRow,
	SessionEventRow,
	TranscriptSegmentRow,
} from "@/components/saas/agents/AgentSessionDetail";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { type AgentSessionRow, computeAgentStats, mapSession } from "./types";

export type SessionDetail = {
	id: string;
	status: string;
	channel?: string;
	livekitRoomName: string;
	startedAt?: string | Date | null;
	endedAt?: string | Date | null;
	durationMs?: number | null;
	errorMessage?: string | null;
	events?: SessionEventRow[];
	transcript?: {
		text?: string | null;
		fullText?: string | null;
		segments?: TranscriptSegmentRow[];
	} | null;
	egressJobs?: EgressJobRow[];
	metadata?: {
		collectedData?: Record<string, unknown>;
		postProcessing?: {
			status?: "pending" | "running" | "completed" | "failed" | "skipped";
			startedAt?: string;
			completedAt?: string;
			error?: string;
			model?: string;
			face?: {
				livenessPass: boolean;
				confidence: number;
				signals: string[];
				summary: string;
			};
			idCard?: {
				extracted: Record<string, string>;
				confidence: number;
				summary: string;
			};
			body?: {
				vitals: {
					heightCm: number | null;
					weightKg: number | null;
					bmi: number | null;
					heartRateBpm: number | null;
					respiratoryRate: number | null;
					fitnessAssessment: string;
				};
				physicalCondition: {
					impairments: string[];
					mobilityLimitations: string[];
					postureNotes: string;
					assistiveDevices: string[];
					otherFindings: string[];
				};
				underwriting: {
					identityStatus: string;
					livenessStatus: string;
					riskIndicators: string[];
					exceptionFlags: string[];
					underwriterReviewRecommended: boolean;
					summary: string;
				};
				videoUnavailable?: boolean;
			};
			reportFileId?: string;
			videoUnavailable?: boolean;
		};
	} | null;
	endUser?: {
		id: string;
		name: string;
		identity: string;
		email?: string | null;
		phone?: string | null;
		memory?: string[];
	} | null;
	files?: Array<{
		id: string;
		name: string;
		type: string;
		size: number;
		downloadUrl?: string | null;
	}>;
	campaignSession?: {
		outcome?: string | null;
		summary?: string | null;
		recordingUrl?: string | null;
		status?: string;
	} | null;
	callbackSchedules?: Array<{
		id: string;
		scheduledAt: string | Date;
		status: string;
		phoneE164: string;
		source: string;
	}>;
};

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
			const metadata = query.state.data?.session?.metadata;
			const postProcessing =
				metadata &&
				typeof metadata === "object" &&
				!Array.isArray(metadata) &&
				"postProcessing" in metadata &&
				metadata.postProcessing &&
				typeof metadata.postProcessing === "object" &&
				!Array.isArray(metadata.postProcessing)
					? (metadata.postProcessing as { status?: string })
					: null;
			const postProcessingStatus = postProcessing?.status;
			const postProcessingOpen =
				postProcessingStatus === "pending" ||
				postProcessingStatus === "running";
			if (
				status === "ACTIVE" ||
				status === "QUEUED" ||
				egressOpen ||
				postProcessingOpen
			) {
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
