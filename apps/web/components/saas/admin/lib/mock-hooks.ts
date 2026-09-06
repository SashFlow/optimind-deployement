"use client";

import { useQuery } from "@tanstack/react-query";
import type { AuditLogRow, BackgroundJobRow } from "./types";

const MOCK_AUDIT_LOGS: AuditLogRow[] = [
	{
		id: "audit_mock_1",
		occurred_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
		action: "update",
		resource_type: "agent",
		resource_id: "agent_demo_001",
		actor_account_id: "user_demo_admin",
		ip: "203.0.113.10",
	},
	{
		id: "audit_mock_2",
		occurred_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
		action: "invite",
		resource_type: "invite",
		resource_id: "invite_demo_002",
		actor_account_id: "user_demo_admin",
		ip: "203.0.113.10",
	},
	{
		id: "audit_mock_3",
		occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
		action: "create",
		resource_type: "campaign",
		resource_id: "camp_demo_003",
		actor_account_id: "user_demo_ops",
		ip: "198.51.100.42",
	},
	{
		id: "audit_mock_4",
		occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
		action: "login",
		resource_type: "session",
		resource_id: "sess_demo_004",
		actor_account_id: "user_demo_ops",
		ip: "198.51.100.42",
	},
	{
		id: "audit_mock_5",
		occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
		action: "delete",
		resource_type: "phone_number",
		resource_id: "pn_demo_005",
		actor_account_id: "user_demo_admin",
		ip: "203.0.113.10",
	},
];

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

export type AuditLogFilters = {
	action?: string;
	resource_type?: string;
	limit?: number;
};

export function useAuditLogsQuery(
	organizationId: string | null | undefined,
	filters: AuditLogFilters = {},
) {
	return useQuery({
		queryKey: [
			"mock-audit-logs",
			organizationId ?? "none",
			filters.action ?? "all",
			filters.resource_type ?? "all",
			filters.limit ?? 100,
		],
		enabled: true,
		queryFn: async (): Promise<AuditLogRow[]> => {
			await new Promise((resolve) => setTimeout(resolve, 200));
			let rows = MOCK_AUDIT_LOGS;
			if (filters.action) {
				rows = rows.filter((row) => row.action === filters.action);
			}
			if (filters.resource_type) {
				rows = rows.filter(
					(row) => row.resource_type === filters.resource_type,
				);
			}
			return rows.slice(0, filters.limit ?? 100);
		},
	});
}

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
