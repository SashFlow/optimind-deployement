"use client";

import { Button } from "@repo/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreVerticalIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	useAdminBackgroundJobsQuery,
	useCancelBackgroundJobMutation,
	useRetryBackgroundJobMutation,
} from "@/components/saas/admin/lib/mock-hooks";
import {
	DataTableBulkBar,
	StatusBadge,
} from "@/components/saas/shared/DataTable";
import { PAGE_SIZE } from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import { DataTable } from "@/components/saas/shared/StandardDataTable";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { useSettingsBulkActions } from "@/context/AdminSettingsActionsProvider";
import type { BackgroundJobRow } from "@/types/admin";

type StatusFilter =
	| "all"
	| "pending"
	| "running"
	| "completed"
	| "failed"
	| "cancelled"
	| "retrying";

type JobTypeFilter =
	| "all"
	| "campaign_dial"
	| "egress"
	| "knowledge_ingest"
	| "plivo_provision"
	| "celery_generic";

const STATUS_FILTER_ITEMS = [
	{ value: "all", label: "All statuses" },
	{ value: "pending", label: "Pending" },
	{ value: "running", label: "Running" },
	{ value: "completed", label: "Completed" },
	{ value: "failed", label: "Failed" },
	{ value: "cancelled", label: "Cancelled" },
	{ value: "retrying", label: "Retrying" },
] as const;

const JOB_TYPE_FILTER_ITEMS = [
	{ value: "all", label: "All types" },
	{ value: "campaign_dial", label: "Campaign dial" },
	{ value: "egress", label: "Egress" },
	{ value: "knowledge_ingest", label: "Knowledge ingest" },
	{ value: "plivo_provision", label: "Plivo provision" },
	{ value: "celery_generic", label: "Celery generic" },
] as const;

function canCancelStatus(status: string) {
	return (
		status === "pending" ||
		status === "failed" ||
		status === "retrying" ||
		status === "running"
	);
}

function canRetryStatus(status: string) {
	return status === "failed" || status === "cancelled";
}

function mutationErrorMessage(error: unknown, fallback: string) {
	if (error && typeof error === "object" && "message" in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string" && message.trim()) {
			return message;
		}
	}
	return fallback;
}

export default function BackgroundJobsPageContent() {
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id ?? "";
	const [status, setStatus] = useState<StatusFilter>("all");
	const [jobType, setJobType] = useState<JobTypeFilter>("all");
	const [bulkBusy, setBulkBusy] = useState(false);
	const selectedJobsRef = useRef<BackgroundJobRow[]>([]);
	const clearSelectionRef = useRef<() => void>(() => {});
	const query = useAdminBackgroundJobsQuery({
		status: status === "all" ? undefined : status,
		job_type: jobType === "all" ? undefined : jobType,
	});
	const cancelMutation = useCancelBackgroundJobMutation();
	const retryMutation = useRetryBackgroundJobMutation();

	const jobs = query.data ?? [];

	async function cancelJob(id: string) {
		if (!organizationId) {
			toast.error("No active organization");
			return;
		}
		try {
			await cancelMutation.mutateAsync({ id, organizationId });
			toast.success("Job cancelled");
			await query.refetch();
		} catch (error) {
			toast.error(mutationErrorMessage(error, "Failed to cancel job"));
		}
	}

	async function retryJob(id: string) {
		if (!organizationId) {
			toast.error("No active organization");
			return;
		}
		try {
			await retryMutation.mutateAsync({ id, organizationId });
			toast.success("Job retried");
			await query.refetch();
		} catch (error) {
			toast.error(mutationErrorMessage(error, "Failed to retry job"));
		}
	}

	const cancelFailed = useCallback(async () => {
		if (!organizationId) {
			toast.error("No active organization");
			return;
		}
		const targets = (query.data ?? []).filter(
			(job) =>
				job.status === "failed" ||
				job.status === "pending" ||
				job.status === "retrying",
		);
		if (targets.length === 0) {
			toast.error("No failed or pending jobs to cancel");
			return;
		}
		let cancelled = 0;
		for (const job of targets) {
			try {
				await cancelMutation.mutateAsync({
					id: job.id,
					organizationId,
				});
				cancelled += 1;
			} catch {
				// continue remaining jobs
			}
		}
		await query.refetch();
		if (cancelled === 0) {
			toast.error("Failed to cancel jobs");
			return;
		}
		toast.success(
			`Cancelled ${cancelled} job${cancelled === 1 ? "" : "s"}`,
		);
	}, [cancelMutation, organizationId, query]);

	const retryFailed = useCallback(async () => {
		if (!organizationId) {
			toast.error("No active organization");
			return;
		}
		const targets = (query.data ?? []).filter(
			(job) => job.status === "failed" || job.status === "cancelled",
		);
		if (targets.length === 0) {
			toast.error("No failed or cancelled jobs to retry");
			return;
		}
		let retried = 0;
		for (const job of targets) {
			try {
				await retryMutation.mutateAsync({
					id: job.id,
					organizationId,
				});
				retried += 1;
			} catch {
				// continue remaining jobs
			}
		}
		await query.refetch();
		if (retried === 0) {
			toast.error("Failed to retry jobs");
			return;
		}
		toast.success(`Retried ${retried} job${retried === 1 ? "" : "s"}`);
	}, [organizationId, query, retryMutation]);

	useSettingsBulkActions({
		cancelFailed,
		retryFailed,
	});

	const cancelSelected = async () => {
		const selectedCancellable = selectedJobsRef.current.filter((job) =>
			canCancelStatus(job.status),
		);
		if (selectedCancellable.length === 0) return;
		if (!organizationId) {
			toast.error("No active organization");
			return;
		}
		setBulkBusy(true);
		let cancelled = 0;
		for (const job of selectedCancellable) {
			try {
				await cancelMutation.mutateAsync({
					id: job.id,
					organizationId,
				});
				cancelled += 1;
			} catch {
				// continue remaining jobs
			}
		}
		await query.refetch();
		setBulkBusy(false);
		clearSelectionRef.current();
		if (cancelled === 0) {
			toast.error("Failed to cancel jobs");
			return;
		}
		toast.success(
			`Cancelled ${cancelled} job${cancelled === 1 ? "" : "s"}`,
		);
	};

	const retrySelected = async () => {
		const selectedRetryable = selectedJobsRef.current.filter((job) =>
			canRetryStatus(job.status),
		);
		if (selectedRetryable.length === 0) return;
		if (!organizationId) {
			toast.error("No active organization");
			return;
		}
		setBulkBusy(true);
		let retried = 0;
		for (const job of selectedRetryable) {
			try {
				await retryMutation.mutateAsync({
					id: job.id,
					organizationId,
				});
				retried += 1;
			} catch {
				// continue remaining jobs
			}
		}
		await query.refetch();
		setBulkBusy(false);
		clearSelectionRef.current();
		if (retried === 0) {
			toast.error("Failed to retry jobs");
			return;
		}
		toast.success(`Retried ${retried} job${retried === 1 ? "" : "s"}`);
	};

	const filters = (
		<div className="ml-auto flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto">
			<Select
				value={status}
				onValueChange={(value) => {
					if (value) setStatus(value as StatusFilter);
				}}
			>
				<SelectTrigger id="status" className="h-9 w-[9.5rem] shrink-0">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{STATUS_FILTER_ITEMS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={jobType}
				onValueChange={(value) => {
					if (value) setJobType(value as JobTypeFilter);
				}}
			>
				<SelectTrigger id="type" className="h-9 w-48 shrink-0">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{JOB_TYPE_FILTER_ITEMS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);

	const columns = useMemo<ColumnDef<BackgroundJobRow>[]>(
		() => [
			{
				id: "created",
				header: "Created",
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.created_at
							? new Date(row.original.created_at).toLocaleString()
							: "—"}
					</span>
				),
			},
			{
				id: "type",
				header: "Type",
				cell: ({ row }) => (
					<span className="font-medium">{row.original.job_type}</span>
				),
			},
			{
				id: "status",
				header: "Status",
				cell: ({ row }) => (
					<StatusBadge
						label={row.original.status}
						tone={row.original.status}
					/>
				),
			},
			{
				id: "resource",
				header: "Resource",
				cell: ({ row }) => (
					<span className="font-mono text-xs text-muted-foreground">
						{row.original.resource_type ?? "—"}
						{row.original.resource_id
							? `:${row.original.resource_id.slice(0, 8)}`
							: ""}
					</span>
				),
			},
			{
				id: "error",
				header: "Error",
				cell: ({ row }) => (
					<span className="max-w-[200px] truncate text-xs text-destructive">
						{row.original.error ?? ""}
					</span>
				),
			},
			{
				id: "actions",
				header: () => <span className="sr-only">Actions</span>,
				size: 48,
				cell: ({ row }) => {
					const job = row.original;
					const canCancel = canCancelStatus(job.status);
					const canRetry = canRetryStatus(job.status);
					if (!canCancel && !canRetry) return null;
					return (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="size-8"
									aria-label={`Actions for job ${job.id}`}
								>
									<MoreVerticalIcon className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{canCancel ? (
									<DropdownMenuItem
										onClick={() => void cancelJob(job.id)}
									>
										Cancel
									</DropdownMenuItem>
								) : null}
								{canRetry ? (
									<DropdownMenuItem
										onClick={() => void retryJob(job.id)}
									>
										Retry
									</DropdownMenuItem>
								) : null}
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
			},
		],
		[organizationId, cancelMutation, retryMutation, query],
	);

	const isLoading = Boolean(organizationId) && query.isLoading;

	return (
		<section className="flex min-h-0 flex-1 flex-col">
			{!organizationId ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex h-16 shrink-0 items-center border-b border-border/60 px-1 sm:px-0">
						{filters}
					</div>
					<p className="py-6 text-sm text-muted-foreground">
						Select an organization to view background jobs.
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
								"",
								"Created",
								"Type",
								"Status",
								"Resource",
								"Error",
								"Actions",
							]}
							columns={[
								{ type: "action" },
								{ type: "text", width: "w-32" },
								{ type: "text", width: "w-28" },
								{ type: "pill" },
								{ type: "text", width: "w-28" },
								{ type: "text", width: "w-36" },
								{ type: "action" },
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
						Failed to load jobs.
					</p>
				</div>
			) : (
				<DataTable
					key={`${status}-${jobType}`}
					columns={columns}
					data={jobs}
					toolbar={filters}
					framed={false}
					enableRowSelection
					pageSize={PAGE_SIZE}
					getRowId={(row) => row.id}
					emptyMessage="No background jobs."
					onSelectionChange={({ selectedRows, clearSelection }) => {
						selectedJobsRef.current = selectedRows;
						clearSelectionRef.current = clearSelection;
					}}
					bulkBar={({
						selectedRows,
						selectedCount,
						clearSelection,
					}) => {
						const selectedCancellable = selectedRows.filter((job) =>
							canCancelStatus(job.status),
						);
						const selectedRetryable = selectedRows.filter((job) =>
							canRetryStatus(job.status),
						);
						return (
							<DataTableBulkBar
								count={selectedCount}
								onClear={clearSelection}
							>
								{selectedCancellable.length > 0 ? (
									<Button
										type="button"
										size="sm"
										variant="outline"
										disabled={bulkBusy}
										onClick={() => {
											void cancelSelected();
										}}
									>
										Cancel selected
									</Button>
								) : null}
								{selectedRetryable.length > 0 ? (
									<Button
										type="button"
										size="sm"
										variant="outline"
										disabled={bulkBusy}
										onClick={() => {
											void retrySelected();
										}}
									>
										Retry selected
									</Button>
								) : null}
							</DataTableBulkBar>
						);
					}}
				/>
			)}
		</section>
	);
}
