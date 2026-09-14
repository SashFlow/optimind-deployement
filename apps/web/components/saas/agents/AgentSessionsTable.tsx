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
import type { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
	DataTableBulkBar,
	IdentityCell,
	StatusBadge,
} from "@/components/saas/shared/DataTable";
import { PAGE_SIZE } from "@/components/saas/shared/Pagination";
import { DataTable } from "@/components/saas/shared/StandardDataTable";
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
	if (!ms) {
		return "—";
	}
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
	const selectedSessionsRef = useRef<AgentSessionRow[]>([]);
	const clearSelectionRef = useRef<() => void>(() => {});
	const endSession = useEndSessionMutation();

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		return sessions.filter((session) => {
			if (statusFilter !== "all" && session.status !== statusFilter) {
				return false;
			}
			if (!query) {
				return true;
			}
			return (
				session.id.toLowerCase().includes(query) ||
				session.livekitRoomName.toLowerCase().includes(query)
			);
		});
	}, [sessions, search, statusFilter]);

	async function bulkEnd() {
		const selectedEndable = selectedSessionsRef.current.filter((session) =>
			ENDABLE_STATUSES.has(session.status),
		);
		if (selectedEndable.length === 0) {
			return;
		}
		setBulkBusy(true);
		try {
			for (const session of selectedEndable) {
				await endSession.mutateAsync({ id: session.id });
			}
			clearSelectionRef.current();
		} finally {
			setBulkBusy(false);
		}
	}

	const columns = useMemo<ColumnDef<AgentSessionRow>[]>(
		() => [
			{
				id: "session",
				header: "Session",
				cell: ({ row }) => {
					const session = row.original;
					return (
						<Link
							href={`/app/agents/${agentId}/session/${session.id}`}
							className="block min-w-0 underline-offset-2 hover:underline"
						>
							<IdentityCell
								name={session.id.slice(0, 10)}
								secondary={session.livekitRoomName}
								showAvatar={false}
							/>
						</Link>
					);
				},
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => (
					<StatusBadge
						label={row.original.status}
						tone={row.original.status.toLowerCase()}
					/>
				),
			},
			{
				accessorKey: "channel",
				header: "Channel",
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{row.original.channel}
					</span>
				),
			},
			{
				id: "started",
				header: "Started",
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{row.original.startedAt
							? formatDistanceToNow(
									new Date(row.original.startedAt),
									{ addSuffix: true },
								)
							: "—"}
					</span>
				),
			},
			{
				id: "duration",
				header: "Duration",
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{formatDuration(row.original.durationMs)}
					</span>
				),
			},
			{
				id: "actions",
				header: () => <span className="sr-only">Actions</span>,
				size: 96,
				cell: ({ row }) => {
					const session = row.original;
					if (!ENDABLE_STATUSES.has(session.status)) {
						return (
							<span className="text-muted-foreground text-xs">
								—
							</span>
						);
					}
					return (
						<div className="flex items-center justify-end">
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={
									(endSession.isPending &&
										endSession.variables?.id ===
											session.id) ||
									bulkBusy
								}
								onClick={() =>
									endSession.mutate({
										id: session.id,
									})
								}
							>
								{endSession.isPending &&
								endSession.variables?.id === session.id
									? "Ending…"
									: "End"}
							</Button>
						</div>
					);
				},
			},
		],
		[agentId, bulkBusy, endSession],
	);

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

	return (
		<section className="flex min-h-0 flex-1 flex-col">
			{isLoading ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex h-16 shrink-0 items-center border-b border-border/60 px-1 sm:px-0">
						{filters}
					</div>
					<div className="min-h-0 flex-1 overflow-x-auto">
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
					</div>
				</div>
			) : isError ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex h-16 shrink-0 items-center border-b border-border/60 px-1 sm:px-0">
						{filters}
					</div>
					<p className="py-6 text-sm text-destructive">
						Failed to load sessions.
					</p>
				</div>
			) : (
				<DataTable
					key={`${search}-${statusFilter}`}
					columns={columns}
					data={filtered}
					toolbar={filters}
					framed={false}
					enableRowSelection
					pageSize={PAGE_SIZE}
					getRowId={(row) => row.id}
					emptyMessage="No sessions found."
					onSelectionChange={({ selectedRows, clearSelection }) => {
						selectedSessionsRef.current = selectedRows;
						clearSelectionRef.current = clearSelection;
					}}
					bulkBar={({
						selectedRows,
						selectedCount,
						clearSelection,
					}) => {
						const selectedEndable = selectedRows.filter((session) =>
							ENDABLE_STATUSES.has(session.status),
						);
						return (
							<DataTableBulkBar
								count={selectedCount}
								onClear={clearSelection}
							>
								{selectedEndable.length > 0 ? (
									<Button
										type="button"
										size="sm"
										variant="outline"
										disabled={
											bulkBusy || endSession.isPending
										}
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
						);
					}}
				/>
			)}
		</section>
	);
}
