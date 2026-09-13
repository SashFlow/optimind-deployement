"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PAGE_SIZE } from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import { DataTable } from "@/components/saas/shared/StandardDataTable";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { useSettingsPageAction } from "@/context/AdminSettingsActionsProvider";
import type { AuditLogRow } from "@/types/admin";

type ActionFilter =
	| "all"
	| "create"
	| "update"
	| "delete"
	| "publish"
	| "invite"
	| "login"
	| "logout";

type ResourceTypeFilter =
	| "all"
	| "account"
	| "agent"
	| "agent_access"
	| "agent_version"
	| "background_job"
	| "campaign"
	| "campaign_contacts"
	| "campaign_queue_item"
	| "egress"
	| "invite"
	| "knowledge_source"
	| "org_credential"
	| "organization"
	| "phone_number"
	| "plivo_credentials"
	| "plivo_number"
	| "session"
	| "sip_dispatch_rule"
	| "sip_trunk";

const ACTION_FILTER_ITEMS = [
	{ value: "all", label: "All actions" },
	{ value: "create", label: "Create" },
	{ value: "update", label: "Update" },
	{ value: "delete", label: "Delete" },
	{ value: "publish", label: "Publish" },
	{ value: "invite", label: "Invite" },
	{ value: "login", label: "Login" },
	{ value: "logout", label: "Logout" },
] as const;

const RESOURCE_TYPE_FILTER_ITEMS = [
	{ value: "all", label: "All resources" },
	{ value: "account", label: "Account" },
	{ value: "agent", label: "Agent" },
	{ value: "agent_access", label: "Agent access" },
	{ value: "agent_version", label: "Agent version" },
	{ value: "background_job", label: "Background job" },
	{ value: "campaign", label: "Campaign" },
	{ value: "campaign_contacts", label: "Campaign contacts" },
	{ value: "campaign_queue_item", label: "Campaign queue item" },
	{ value: "egress", label: "Egress" },
	{ value: "invite", label: "Invite" },
	{ value: "knowledge_source", label: "Knowledge source" },
	{ value: "org_credential", label: "Org credential" },
	{ value: "organization", label: "Organization" },
	{ value: "phone_number", label: "Phone number" },
	{ value: "plivo_credentials", label: "Plivo credentials" },
	{ value: "plivo_number", label: "Plivo number" },
	{ value: "session", label: "Session" },
	{ value: "sip_dispatch_rule", label: "SIP dispatch rule" },
	{ value: "sip_trunk", label: "SIP trunk" },
] as const;

function csvEscape(value: string) {
	if (/[",\n]/.test(value)) {
		return `"${value.replaceAll('"', '""')}"`;
	}
	return value;
}

const columns: ColumnDef<AuditLogRow>[] = [
	{
		id: "when",
		header: "When",
		cell: ({ row }) => (
			<span className="text-muted-foreground">
				{new Date(row.original.occurred_at).toLocaleString()}
			</span>
		),
	},
	{
		id: "action",
		header: "Action",
		cell: ({ row }) => (
			<span className="font-medium">{row.original.action}</span>
		),
	},
	{
		id: "resource",
		header: "Resource",
		cell: ({ row }) => (
			<>
				<span className="text-muted-foreground">
					{row.original.resource_type}
				</span>
				{row.original.resource_id ? (
					<span className="ml-1 font-mono text-xs text-muted-foreground">
						{row.original.resource_id.slice(0, 8)}
					</span>
				) : null}
			</>
		),
	},
	{
		id: "actor",
		header: "Actor",
		cell: ({ row }) => (
			<span className="font-mono text-xs text-muted-foreground">
				{row.original.actor_account_id?.slice(0, 8) ?? "—"}
			</span>
		),
	},
	{
		id: "ip",
		header: "IP",
		cell: ({ row }) => (
			<span className="text-xs text-muted-foreground">
				{row.original.ip ?? "—"}
			</span>
		),
	},
];

export default function AuditLogsPageContent() {
	const { activeOrganization } = useActiveOrganization();
	const activeOrganizationId = activeOrganization?.id ?? null;
	const [action, setAction] = useState<ActionFilter>("all");
	const [resourceType, setResourceType] = useState<ResourceTypeFilter>("all");

	const query = useQuery({
		...orpc.audit.list.queryOptions({
			input: {
				organizationId: activeOrganizationId ?? "",
				action: action === "all" ? undefined : action,
				resourceType: resourceType === "all" ? undefined : resourceType,
				limit: 100,
			},
		}),
		enabled: Boolean(activeOrganizationId),
	});

	const rows = query.data?.logs ?? [];

	const exportCsv = useCallback(() => {
		if (rows.length === 0) {
			toast.error("No audit events to export");
			return;
		}

		const header = ["When", "Action", "Resource", "Actor", "IP"];
		const lines = [
			header.join(","),
			...rows.map((row) =>
				[
					new Date(row.occurred_at).toISOString(),
					row.action,
					`${row.resource_type}${row.resource_id ? `:${row.resource_id}` : ""}`,
					row.actor_account_id ?? "",
					row.ip ?? "",
				]
					.map((cell) => csvEscape(String(cell)))
					.join(","),
			),
		];

		const blob = new Blob([lines.join("\n")], {
			type: "text/csv;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
		toast.success(`Exported ${rows.length} events`);
	}, [rows]);

	useSettingsPageAction(exportCsv, "Export CSV");

	const filters = (
		<div className="ml-auto flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto">
			<Select
				value={action}
				onValueChange={(value) => {
					if (value) setAction(value as ActionFilter);
				}}
			>
				<SelectTrigger id="action" className="h-9 w-[9.5rem] shrink-0">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{ACTION_FILTER_ITEMS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={resourceType}
				onValueChange={(value) => {
					if (value) setResourceType(value as ResourceTypeFilter);
				}}
			>
				<SelectTrigger id="resource" className="h-9 w-52 shrink-0">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{RESOURCE_TYPE_FILTER_ITEMS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);

	const isLoading = Boolean(activeOrganizationId) && query.isLoading;

	return (
		<section className="flex min-h-0 flex-1 flex-col">
			{!activeOrganizationId ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex h-16 shrink-0 items-center border-b border-border/60 px-1 sm:px-0">
						{filters}
					</div>
					<p className="py-6 text-sm text-muted-foreground">
						Select an organization to view audit events.
					</p>
				</div>
			) : isLoading ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex h-16 shrink-0 items-center border-b border-border/60 px-1 sm:px-0">
						{filters}
					</div>
					<div className="min-h-0 flex-1 overflow-x-auto">
						<TableBodySkeleton
							headers={[
								"When",
								"Action",
								"Resource",
								"Actor",
								"IP",
							]}
							columns={[
								{ type: "text", width: "w-32" },
								{ type: "text", width: "w-24" },
								{ type: "lines", widths: ["w-20", "w-16"] },
								{ type: "text", width: "w-16" },
								{ type: "text", width: "w-20" },
							]}
						/>
					</div>
				</div>
			) : query.isError ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex h-16 shrink-0 items-center border-b border-border/60 px-1 sm:px-0">
						{filters}
					</div>
					<p className="py-6 text-sm text-destructive">
						Failed to load audit logs.
					</p>
				</div>
			) : (
				<DataTable
					key={`${action}-${resourceType}`}
					columns={columns}
					data={rows}
					toolbar={filters}
					framed={false}
					pageSize={PAGE_SIZE}
					getRowId={(row) => row.id}
					emptyMessage="No audit events."
				/>
			)}
		</section>
	);
}
