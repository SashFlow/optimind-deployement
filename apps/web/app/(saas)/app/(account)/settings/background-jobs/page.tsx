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
import { cn } from "@repo/ui/utils";
import { MoreVerticalIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSettingsBulkActions } from "@/components/saas/admin/AdminSettingsActions";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import { useAdminBackgroundJobsQuery } from "@/components/saas/admin/lib/mock-hooks";
import { Pagination } from "@/components/saas/shared/Pagination";

const ITEMS_PER_PAGE = 10;

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

function jobStatusClass(status: string) {
	switch (status) {
		case "completed":
		case "succeeded":
			return "bg-emerald-50 text-emerald-700";
		case "failed":
			return "bg-rose-50 text-rose-700";
		case "pending":
		case "retrying":
			return "bg-amber-50 text-amber-700";
		case "running":
			return "bg-sky-50 text-sky-700";
		case "cancelled":
			return "bg-slate-50 text-slate-700";
		default:
			return "bg-slate-50 text-slate-700";
	}
}

export default function BackgroundJobsPage() {
	const [status, setStatus] = useState<StatusFilter>("all");
	const [jobType, setJobType] = useState<JobTypeFilter>("all");
	const [currentPage, setCurrentPage] = useState(1);
	const query = useAdminBackgroundJobsQuery({
		status: status === "all" ? undefined : status,
		job_type: jobType === "all" ? undefined : jobType,
	});

	const jobs = query.data ?? [];
	const pageCount = Math.max(1, Math.ceil(jobs.length / ITEMS_PER_PAGE));

	useEffect(() => {
		setCurrentPage(1);
	}, [status, jobType]);

	useEffect(() => {
		if (currentPage > pageCount) setCurrentPage(pageCount);
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return jobs.slice(start, start + ITEMS_PER_PAGE);
	}, [jobs, currentPage]);

	async function cancelJob(_id: string) {
		toast.message("Cancel is mocked until a background-jobs API exists");
		await query.refetch();
	}

	async function retryJob(_id: string) {
		toast.message("Retry is mocked until a background-jobs API exists");
		await query.refetch();
	}

	const cancelFailed = useCallback(async () => {
		const jobs = (query.data ?? []).filter(
			(job) =>
				job.status === "failed" ||
				job.status === "pending" ||
				job.status === "retrying",
		);
		if (jobs.length === 0) {
			toast.error("No failed or pending jobs to cancel");
			return;
		}
		toast.message(
			`Cancel failed is mocked (${jobs.length} job${jobs.length === 1 ? "" : "s"})`,
		);
		await query.refetch();
	}, [query]);

	const retryFailed = useCallback(async () => {
		const jobs = (query.data ?? []).filter(
			(job) => job.status === "failed" || job.status === "cancelled",
		);
		if (jobs.length === 0) {
			toast.error("No failed or cancelled jobs to retry");
			return;
		}
		toast.message(
			`Retry failed is mocked (${jobs.length} job${jobs.length === 1 ? "" : "s"})`,
		);
		await query.refetch();
	}, [query]);

	useSettingsBulkActions({
		cancelFailed,
		retryFailed,
	});

	return (
		<section className="space-y-6">
			<div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
				<div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-end">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<Select
							value={status}
							onValueChange={(value) => {
								if (value) setStatus(value as StatusFilter);
							}}
						>
							<SelectTrigger
								id="status"
								className="w-full sm:w-44"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STATUS_FILTER_ITEMS.map((option) => (
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
							value={jobType}
							onValueChange={(value) => {
								if (value) setJobType(value as JobTypeFilter);
							}}
						>
							<SelectTrigger id="type" className="w-full sm:w-48">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{JOB_TYPE_FILTER_ITEMS.map((option) => (
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
						Failed to load jobs.
					</p>
				) : jobs.length === 0 ? (
					<p className="p-6 text-sm text-muted-foreground">
						No background jobs.
					</p>
				) : (
					<>
						<div className="overflow-x-auto scrollbar-none">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>Created</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Resource</TableHead>
										<TableHead>Error</TableHead>
										<TableHead className="w-12">
											<span className="sr-only">
												Actions
											</span>
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paged.map((job) => {
										const canCancel =
											job.status === "pending" ||
											job.status === "failed" ||
											job.status === "retrying";
										const canRetry =
											job.status === "failed" ||
											job.status === "cancelled";
										return (
											<TableRow key={job.id}>
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
													<span
														className={cn(
															"inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
															jobStatusClass(
																job.status,
															),
														)}
													>
														{job.status}
													</span>
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
						</div>
						<footer className="border-t px-5 py-3">
							<Pagination
								totalItems={jobs.length}
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
