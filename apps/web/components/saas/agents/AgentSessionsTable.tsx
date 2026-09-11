"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
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
import { formatDistanceToNow } from "date-fns";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	PAGE_SIZE,
	Pagination,
	useClientPagination,
} from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import { useEndSessionMutation } from "./lib/hooks";
import type { AgentSessionRow } from "./lib/types";

type StatusFilter =
	| "all"
	| "QUEUED"
	| "ACTIVE"
	| "COMPLETED"
	| "FAILED"
	| "CANCELLED";

const ENDABLE_STATUSES = new Set(["QUEUED", "ACTIVE"]);

const STATUS_FILTER_ITEMS: { value: StatusFilter; label: string }[] = [
	{ value: "all", label: "All statuses" },
	{ value: "ACTIVE", label: "Active" },
	{ value: "COMPLETED", label: "Completed" },
	{ value: "FAILED", label: "Failed" },
	{ value: "CANCELLED", label: "Cancelled" },
	{ value: "QUEUED", label: "Queued" },
];

function formatDuration(ms: number | null) {
	if (!ms) return "—";
	const seconds = Math.floor(ms / 1000);
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function statusPillClass(status: string) {
	if (status === "ACTIVE" || status === "QUEUED") {
		return "bg-emerald-50 text-emerald-700";
	}
	if (status === "COMPLETED") return "bg-slate-50 text-slate-700";
	if (status === "FAILED") return "bg-rose-50 text-rose-700";
	if (status === "CANCELLED") return "bg-violet-50 text-violet-700";
	return "bg-amber-50 text-amber-700";
}

export function AgentSessionsTable({
	sessions,
	agentId,
	isLoading = false,
	isError = false,
}: {
	sessions: AgentSessionRow[];
	agentId: string;
	organizationId?: string;
	isLoading?: boolean;
	isError?: boolean;
}) {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const endSession = useEndSessionMutation();

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		return sessions.filter((session) => {
			if (statusFilter !== "all" && session.status !== statusFilter) {
				return false;
			}
			if (!query) return true;
			return (
				session.id.toLowerCase().includes(query) ||
				session.livekitRoomName.toLowerCase().includes(query)
			);
		});
	}, [sessions, search, statusFilter]);

	const { currentPage, setCurrentPage, pageItems, totalItems } =
		useClientPagination(filtered);

	useEffect(() => {
		setCurrentPage(1);
	}, [search, statusFilter, setCurrentPage]);

	return (
		<section className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-6">
			<div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
				<div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-end">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<div className="relative min-w-0 sm:w-72">
							<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) =>
									setSearch(event.target.value)
								}
								placeholder="Search sessions..."
								className="pl-9"
							/>
						</div>
						<Select
							value={statusFilter}
							onValueChange={(value) =>
								setStatusFilter(value as StatusFilter)
							}
						>
							<SelectTrigger className="w-full sm:w-40">
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
					</div>
				</div>

				{isLoading ? (
					<TableBodySkeleton
						headers={[
							"Session",
							"Status",
							"Channel",
							"Started",
							"Duration",
							"Actions",
						]}
						columns={[
							{ type: "text", width: "w-28" },
							{ type: "pill" },
							{ type: "text", width: "w-16" },
							{ type: "text", width: "w-24" },
							{ type: "text", width: "w-14" },
							{ type: "action" },
						]}
					/>
				) : isError ? (
					<p className="p-6 text-sm text-destructive">
						Failed to load sessions.
					</p>
				) : filtered.length === 0 ? (
					<p className="p-6 text-sm text-muted-foreground">
						No sessions found.
					</p>
				) : (
					<>
						<div className="overflow-x-auto scrollbar-none">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>Session</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Channel</TableHead>
										<TableHead>Started</TableHead>
										<TableHead>Duration</TableHead>
										<TableHead className="text-right">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{pageItems.map((session) => (
										<TableRow key={session.id}>
											<TableCell>
												<Link
													href={`/app/agents/${agentId}/session/${session.id}`}
													className="font-mono text-xs font-medium underline-offset-2 hover:underline"
												>
													{session.id.slice(0, 10)}
												</Link>
												<p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
													{session.livekitRoomName}
												</p>
											</TableCell>
											<TableCell>
												<span
													className={cn(
														"inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
														statusPillClass(
															session.status,
														),
													)}
												>
													{session.status}
												</span>
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{session.channel}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{session.startedAt
													? formatDistanceToNow(
															new Date(
																session.startedAt,
															),
															{ addSuffix: true },
														)
													: "—"}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{formatDuration(
													session.durationMs,
												)}
											</TableCell>
											<TableCell className="text-right">
												{ENDABLE_STATUSES.has(
													session.status,
												) ? (
													<Button
														type="button"
														size="sm"
														variant="outline"
														disabled={
															endSession.isPending &&
															endSession.variables
																?.id ===
																session.id
														}
														onClick={() =>
															endSession.mutate({
																id: session.id,
															})
														}
													>
														{endSession.isPending &&
														endSession.variables
															?.id === session.id
															? "Ending…"
															: "End"}
													</Button>
												) : (
													<span className="text-muted-foreground text-xs">
														—
													</span>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
						<footer className="border-t px-5 py-3">
							<Pagination
								totalItems={totalItems}
								itemsPerPage={PAGE_SIZE}
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
