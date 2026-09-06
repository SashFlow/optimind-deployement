"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSettingsPageAction } from "@/components/saas/admin/AdminSettingsActions";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import { useAuditLogsQuery } from "@/components/saas/admin/lib/mock-hooks";
import { Pagination } from "@/components/saas/shared/Pagination";

const ITEMS_PER_PAGE = 10;

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

export default function AuditLogsPage() {
	const { activeOrganization } = useActiveOrganization();
	const activeOrganizationId = activeOrganization?.id ?? null;
	const [action, setAction] = useState<ActionFilter>("all");
	const [resourceType, setResourceType] = useState<ResourceTypeFilter>("all");
	const [currentPage, setCurrentPage] = useState(1);
	const query = useAuditLogsQuery(activeOrganizationId, {
		action: action === "all" ? undefined : action,
		resource_type: resourceType === "all" ? undefined : resourceType,
		limit: 100,
	});

	const rows = query.data ?? [];
	const pageCount = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));

	useEffect(() => {
		setCurrentPage(1);
	}, [action, resourceType]);

	useEffect(() => {
		if (currentPage > pageCount) setCurrentPage(pageCount);
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return rows.slice(start, start + ITEMS_PER_PAGE);
	}, [rows, currentPage]);

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

	useSettingsPageAction(exportCsv);

	return (
		<section className="space-y-6">
			<div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
				<div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-end">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<Select
							value={action}
							onValueChange={(value) => {
								if (value) setAction(value as ActionFilter);
							}}
						>
							<SelectTrigger
								id="action"
								className="w-full sm:w-44"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ACTION_FILTER_ITEMS.map((option) => (
									<SelectItem
										key={option.value}
										value={option.value}
									>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={resourceType}
							onValueChange={(value) => {
								if (value)
									setResourceType(
										value as ResourceTypeFilter,
									);
							}}
						>
							<SelectTrigger
								id="resource"
								className="w-full sm:w-52"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{RESOURCE_TYPE_FILTER_ITEMS.map((option) => (
									<SelectItem
										key={option.value}
										value={option.value}
									>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{query.isLoading ? (
					<LoadingState />
				) : query.isError ? (
					<p className="p-6 text-sm text-destructive">
						Failed to load audit logs.
					</p>
				) : rows.length === 0 ? (
					<p className="p-6 text-sm text-muted-foreground">
						No audit events.
					</p>
				) : (
					<>
						<div className="overflow-x-auto scrollbar-none">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>When</TableHead>
										<TableHead>Action</TableHead>
										<TableHead>Resource</TableHead>
										<TableHead>Actor</TableHead>
										<TableHead>IP</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paged.map((row) => (
										<TableRow key={row.id}>
											<TableCell className="text-muted-foreground">
												{new Date(
													row.occurred_at,
												).toLocaleString()}
											</TableCell>
											<TableCell className="font-medium">
												{row.action}
											</TableCell>
											<TableCell>
												<span className="text-muted-foreground">
													{row.resource_type}
												</span>
												{row.resource_id ? (
													<span className="ml-1 font-mono text-xs text-muted-foreground">
														{row.resource_id.slice(
															0,
															8,
														)}
													</span>
												) : null}
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{row.actor_account_id?.slice(
													0,
													8,
												) ?? "—"}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{row.ip ?? "—"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
						<footer className="border-t px-5 py-3">
							<Pagination
								totalItems={rows.length}
								itemsPerPage={ITEMS_PER_PAGE}
								currentPage={currentPage}
								onChangeCurrentPage={setCurrentPage}
							/>
						</footer>
					</>
				)}
			</div>
		</section>
	);
}
