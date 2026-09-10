"use client";

import { useQuery } from "@tanstack/react-query";
import type { BackgroundJobRow } from "./types";

const MOCK_BACKGROUND_JOBS: BackgroundJobRow[] = [
	{
		id: "job_mock_1",
		created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
		job_type: "knowledge_ingest",
		status: "running",
		resource_type: "knowledge_source",
		resource_id: "ks_demo_001",
		error: null,
	},
	{
		id: "job_mock_2",
		created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
		job_type: "campaign_dial",
		status: "failed",
		resource_type: "campaign",
		resource_id: "camp_demo_002",
		error: "Provider timeout after 3 retries",
	},
	{
		id: "job_mock_3",
		created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
		job_type: "egress",
		status: "completed",
		resource_type: "egress",
		resource_id: "eg_demo_003",
		error: null,
	},
	{
		id: "job_mock_4",
		created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
		job_type: "plivo_provision",
		status: "pending",
		resource_type: "phone_number",
		resource_id: "pn_demo_004",
		error: null,
	},
	{
		id: "job_mock_5",
		created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
		job_type: "celery_generic",
		status: "cancelled",
		resource_type: "background_job",
		resource_id: "job_demo_005",
		error: null,
	},
	{
		id: "job_mock_6",
		created_at: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
		job_type: "campaign_dial",
		status: "retrying",
		resource_type: "campaign",
		resource_id: "camp_demo_006",
		error: "Transient SIP failure",
	},
];

export type BackgroundJobFilters = {
	status?: string;
	job_type?: string;
};

export function useAdminBackgroundJobsQuery(
	filters: BackgroundJobFilters = {},
) {
	return useQuery({
		queryKey: [
			"mock-background-jobs",
			filters.status ?? "all",
			filters.job_type ?? "all",
		],
		queryFn: async (): Promise<BackgroundJobRow[]> => {
			await new Promise((resolve) => setTimeout(resolve, 200));
			let rows = MOCK_BACKGROUND_JOBS;
			if (filters.status) {
				rows = rows.filter((row) => row.status === filters.status);
			}
			if (filters.job_type) {
				rows = rows.filter((row) => row.job_type === filters.job_type);
			}
			return rows;
		},
	});
}
