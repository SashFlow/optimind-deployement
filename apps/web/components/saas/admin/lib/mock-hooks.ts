"use client";

import { orpcClient } from "@shared/lib/orpc-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import type { BackgroundJobRow } from "@/types/admin";

export type BackgroundJobFilters = {
	status?:
		| "pending"
		| "running"
		| "completed"
		| "failed"
		| "cancelled"
		| "retrying";
	job_type?:
		| "campaign_dial"
		| "egress"
		| "knowledge_ingest"
		| "plivo_provision"
		| "celery_generic";
};

export function useAdminBackgroundJobsQuery(
	filters: BackgroundJobFilters = {},
) {
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id ?? "";

	return useQuery({
		queryKey: [
			"background-jobs",
			organizationId,
			filters.status ?? "all",
			filters.job_type ?? "all",
		],
		enabled: Boolean(organizationId),
		queryFn: async (): Promise<BackgroundJobRow[]> => {
			const result = await orpcClient.jobs.list({
				organizationId,
				status: filters.status,
				job_type: filters.job_type,
				limit: 200,
			});
			return result.jobs;
		},
	});
}

export function useCancelBackgroundJobMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: { id: string; organizationId: string }) => {
			return orpcClient.jobs.cancel(input);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["background-jobs"],
			});
		},
	});
}

export function useRetryBackgroundJobMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: { id: string; organizationId: string }) => {
			return orpcClient.jobs.retry(input);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["background-jobs"],
			});
		},
	});
}
