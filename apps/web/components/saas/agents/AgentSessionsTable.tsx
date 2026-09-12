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
import { formatDistanceToNow } from "date-fns";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	DataTableBody,
	DataTableBulkBar,
	DataTableHeaderRow,
	DataTableShell,
	IdentityCell,
	RowCheckbox,
	SelectColumnHead,
	StatusBadge,
	dataTableRowClass,
} from "@/components/saas/shared/DataTable";
import {
	PAGE_SIZE,
	Pagination,
	useClientPagination,
} from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import { useRowSelection } from "@/components/saas/shared/useRowSelection";
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
	const [bulkBusy, setBulkBusy] = useState(false);
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

	const pageIds = useMemo(
		() => pageItems.map((session) => session.id),
		[pageItems],
	);
	const selection = useRowSelection(pageIds);

	const selectedEndable = useMemo(() => {
		const byId = new Map(sessions.map((s) => [s.id, s]));
		return selection.selectedIds
			.map((id) => byId.get(id))
			.filter((session): session is AgentSessionRow => Boolean(session))
			.filter((session) => ENDABLE_STATUSES.has(session.status));
	}, [selection.selectedIds, sessions]);

	async function bulkEnd() {
		if (selectedEndable.length === 0) return;
		setBulkBusy(true);
		try {
			for (const session of selectedEndable) {
				await endSession.mutateAsync({ id: session.id });
			}
			selection.clear();
		} finally {
			setBulkBusy(false);
		}
	}

	const filters = (
		<div className="ml-auto flex flex-col gap-2 sm:flex-row sm:items-center">
			<div className="relative min-w-0 sm:w-72">
				<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search sessions..."
					className="pl-9"
				/>
			</div>
			<Select
				value={statusFilter}
				onValueChange={(value) =>
					value && setStatusFilter(value as StatusFilter)
				}
			>
				<SelectTrigger className="w-full sm:w-40">
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
		</div>
	);

	const bulkBar =
		selection.selectedCount > 0 ? (
			<DataTableBulkBar
				count={selection.selectedCount}
				onClear={selection.clear}
			>
				{selectedEndable.length > 0 ? (
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={bulkBusy || endSession.isPending}
						onClick={() => {
							void bulkEnd();
						}}
					>
						{bulkBusy
							? "Ending…"
							: `End selected (${selectedEndable.length})`}
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
					!isLoading && !isError && filtered.length > 0 ? (
						<Pagination
							totalItems={totalItems}
							itemsPerPage={PAGE_SIZE}
							currentPage={currentPage}
							onChangeCurrentPage={setCurrentPage}
						/>
					) : null
				}
			>
				{isLoading ? (
					<DataTableBody>
						<TableBodySkeleton
							headers={[
								"",
								"Session",
								"Status",
								"Channel",
								"Started",
								"Duration",
								"Actions",
							]}
							columns={[
								{ type: "action" },
								{ type: "text", width: "w-28" },
								{ type: "pill" },
								{ type: "text", width: "w-16" },
								{ type: "text", width: "w-24" },
								{ type: "text", width: "w-14" },
								{ type: "action" },
							]}
						/>
					</DataTableBody>
				) : isError ? (
					<p className="min-h-0 flex-1 p-6 text-sm text-destructive">
						Failed to load sessions.
					</p>
				) : filtered.length === 0 ? (
					<p className="min-h-0 flex-1 p-6 text-sm text-muted-foreground">
						No sessions found.
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
									/>
									<TableHead>Session</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Channel</TableHead>
									<TableHead>Started</TableHead>
									<TableHead>Duration</TableHead>
									<TableHead className="w-24">
										<span className="sr-only">Actions</span>
									</TableHead>
								</DataTableHeaderRow>
							</TableHeader>
							<TableBody>
								{pageItems.map((session) => {
									const selected = selection.isSelected(
										session.id,
									);
									return (
										<TableRow
											key={session.id}
											className={dataTableRowClass(
												selected,
											)}
										>
											<TableCell className="w-10 px-3">
												<RowCheckbox
													checked={selected}
													onToggle={() =>
														selection.toggle(
															session.id,
														)
													}
													label={`Select session ${session.id.slice(0, 10)}`}
												/>
											</TableCell>
											<TableCell>
												<Link
													href={`/app/agents/${agentId}/session/${session.id}`}
													className="block min-w-0 underline-offset-2 hover:underline"
												>
													<IdentityCell
														name={session.id.slice(
															0,
															10,
														)}
														secondary={
															session.livekitRoomName
														}
														showAvatar={false}
													/>
												</Link>
											</TableCell>
											<TableCell>
												<StatusBadge
													label={session.status}
													tone={session.status.toLowerCase()}
												/>
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
											<TableCell>
												<div className="flex items-center justify-end">
													{ENDABLE_STATUSES.has(
														session.status,
													) ? (
														<Button
															type="button"
															size="sm"
															variant="outline"
															disabled={
																(endSession.isPending &&
																	endSession
																		.variables
																		?.id ===
																		session.id) ||
																bulkBusy
															}
															onClick={() =>
																endSession.mutate(
																	{
																		id: session.id,
																	},
																)
															}
														>
															{endSession.isPending &&
															endSession.variables
																?.id ===
																session.id
																? "Ending…"
																: "End"}
														</Button>
													) : (
														<span className="text-muted-foreground text-xs">
															—
														</span>
													)}
												</div>
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
