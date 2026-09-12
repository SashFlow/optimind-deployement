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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { MoreVerticalIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	useAdminBackgroundJobsQuery,
	useCancelBackgroundJobMutation,
	useRetryBackgroundJobMutation,
} from "@/components/saas/admin/lib/mock-hooks";
import {
	DataTableBody,
	DataTableBulkBar,
	DataTableHeaderRow,
	DataTableShell,
	RowCheckbox,
	SelectColumnHead,
	StatusBadge,
	dataTableRowClass,
} from "@/components/saas/shared/DataTable";
import { PAGE_SIZE, Pagination } from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import { useRowSelection } from "@/components/saas/shared/useRowSelection";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { useSettingsBulkActions } from "@/context/AdminSettingsActionsProvider";

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
	const [currentPage, setCurrentPage] = useState(1);
	const [bulkBusy, setBulkBusy] = useState(false);
	const query = useAdminBackgroundJobsQuery({
		status: status === "all" ? undefined : status,
		job_type: jobType === "all" ? undefined : jobType,
	});
	const cancelMutation = useCancelBackgroundJobMutation();
	const retryMutation = useRetryBackgroundJobMutation();

	const jobs = query.data ?? [];
	const pageCount = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));

	useEffect(() => {
		setCurrentPage(1);
	}, [status, jobType]);

	useEffect(() => {
		if (currentPage > pageCount) {
			setCurrentPage(pageCount);
		}
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return jobs.slice(start, start + PAGE_SIZE);
	}, [jobs, currentPage]);

	const pageIds = useMemo(() => paged.map((job) => job.id), [paged]);
	const selection = useRowSelection(pageIds);

	const selectedJobs = useMemo(() => {
		const byId = new Map(jobs.map((job) => [job.id, job]));
		return selection.selectedIds
			.map((id) => byId.get(id))
			.filter((job): job is NonNullable<typeof job> => Boolean(job));
	}, [jobs, selection.selectedIds]);

	const selectedCancellable = selectedJobs.filter((job) =>
		canCancelStatus(job.status),
	);
	const selectedRetryable = selectedJobs.filter((job) =>
		canRetryStatus(job.status),
	);

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
		selection.clear();
		if (cancelled === 0) {
			toast.error("Failed to cancel jobs");
			return;
		}
		toast.success(
			`Cancelled ${cancelled} job${cancelled === 1 ? "" : "s"}`,
		);
	};

	const retrySelected = async () => {
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
		selection.clear();
		if (retried === 0) {
			toast.error("Failed to retry jobs");
			return;
		}
		toast.success(`Retried ${retried} job${retried === 1 ? "" : "s"}`);
	};

	const filters = (
		<div className="ml-auto flex flex-col gap-2 sm:flex-row sm:items-center">
			<Select
				value={status}
				onValueChange={(value) => {
					if (value) {
						setStatus(value as StatusFilter);
					}
				}}
			>
				<SelectTrigger id="status" className="w-full sm:w-44">
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
					if (value) {
						setJobType(value as JobTypeFilter);
					}
				}}
			>
				<SelectTrigger id="type" className="w-full sm:w-48">
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

	const bulkBar =
		selection.selectedCount > 0 ? (
			<DataTableBulkBar
				count={selection.selectedCount}
				onClear={selection.clear}
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
		) : null;

	return (
		<section className="flex min-h-0 flex-1 flex-col">
			<DataTableShell
				toolbar={selection.selectedCount > 0 ? undefined : filters}
				bulkBar={bulkBar}
				footer={
					organizationId &&
					!query.isLoading &&
					!query.isError &&
					jobs.length > 0 ? (
						<Pagination
							totalItems={jobs.length}
							itemsPerPage={PAGE_SIZE}
							currentPage={currentPage}
							onChangeCurrentPage={setCurrentPage}
						/>
					) : null
				}
			>
				{!organizationId ? (
					<p className="min-h-0 flex-1 p-6 text-sm text-muted-foreground">
						Select an organization to view background jobs.
					</p>
				) : query.isLoading ? (
					<DataTableBody>
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
					</DataTableBody>
				) : query.isError ? (
					<p className="min-h-0 flex-1 p-6 text-sm text-destructive">
						Failed to load jobs.
					</p>
				) : jobs.length === 0 ? (
					<p className="min-h-0 flex-1 p-6 text-sm text-muted-foreground">
						No background jobs.
					</p>
				) : (
					<DataTableBody>
						<Table>
							<TableHeader>
								<DataTableHeaderRow>
									<SelectColumnHead
										allSelected={selection.allPageSelected}
										someSelected={
											selection.somePageSelected
										}
										onToggle={selection.togglePage}
										disabled={bulkBusy}
									/>
									<TableHead>Created</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Resource</TableHead>
									<TableHead>Error</TableHead>
									<TableHead className="w-12">
										<span className="sr-only">Actions</span>
									</TableHead>
								</DataTableHeaderRow>
							</TableHeader>
							<TableBody>
								{paged.map((job) => {
									const canCancel = canCancelStatus(
										job.status,
									);
									const canRetry = canRetryStatus(job.status);
									const selected = selection.isSelected(
										job.id,
									);
									return (
										<TableRow
											key={job.id}
											className={dataTableRowClass(
												selected,
											)}
										>
											<TableCell className="w-10 px-3">
												<RowCheckbox
													checked={selected}
													onToggle={() =>
														selection.toggle(job.id)
													}
													label={`Select job ${job.id}`}
												/>
											</TableCell>
											<TableCell className="text-muted-foreground">
												{job.created_at
													? new Date(
															job.created_at,
														).toLocaleString()
													: "—"}
											</TableCell>
											<TableCell className="font-medium">
												{job.job_type}
											</TableCell>
											<TableCell>
												<StatusBadge
													label={job.status}
													tone={job.status}
												/>
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{job.resource_type ?? "—"}
												{job.resource_id
													? `:${job.resource_id.slice(0, 8)}`
													: ""}
											</TableCell>
											<TableCell className="max-w-[200px] truncate text-xs text-destructive">
												{job.error ?? ""}
											</TableCell>
											<TableCell>
												{canCancel || canRetry ? (
													<DropdownMenu>
														<DropdownMenuTrigger
															asChild
														>
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
																	onClick={() =>
																		void cancelJob(
																			job.id,
																		)
																	}
																>
																	Cancel
																</DropdownMenuItem>
															) : null}
															{canRetry ? (
																<DropdownMenuItem
																	onClick={() =>
																		void retryJob(
																			job.id,
																		)
																	}
																>
																	Retry
																</DropdownMenuItem>
															) : null}
														</DropdownMenuContent>
													</DropdownMenu>
												) : null}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</DataTableBody>
				)}
			</DataTableShell>
		</section>
	);
}
