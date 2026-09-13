"use client";

import { Button } from "@repo/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { cn } from "@repo/ui/utils";
import {
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from "@tanstack/react-table";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronsLeftIcon,
	ChevronsRightIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export type StandardDataTableProps<TData, TValue = unknown> = {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	toolbar?: ReactNode;
	emptyMessage?: string;
	className?: string;
	/** Initial rows per page. Defaults to 10. */
	pageSize?: number;
	enableRowSelection?: boolean;
	getRowId?: (row: TData, index: number) => string;
};

export function StandardDataTable<TData, TValue = unknown>({
	columns,
	data,
	toolbar,
	emptyMessage = "No results.",
	className,
	pageSize: initialPageSize = 10,
	enableRowSelection = false,
	getRowId,
}: StandardDataTableProps<TData, TValue>) {
	"use no memo";

	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState({});
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: initialPageSize,
	});

	const table = useReactTable({
		data,
		columns,
		getRowId,
		enableRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		onPaginationChange: setPagination,
		state: {
			sorting,
			rowSelection,
			pagination,
		},
	});

	return (
		<div
			className={cn(
				"flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs",
				className,
			)}
		>
			{toolbar ? (
				<div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
					{toolbar}
				</div>
			) : null}

			<div className="overflow-x-auto px-2 pt-2 sm:px-3">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								key={headerGroup.id}
								className="border-0 hover:bg-transparent"
							>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										colSpan={header.colSpan}
										style={{
											width: header.getSize() !== 150
												? header.getSize()
												: undefined,
										}}
										className={cn(
											"h-10 bg-muted/70 px-3 first:rounded-tl-xl last:rounded-tr-xl first:pl-4 last:pr-4",
											"text-xs font-medium text-muted-foreground",
										)}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef
														.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={
										row.getIsSelected()
											? "selected"
											: undefined
									}
									className="border-border/50"
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											className="px-3 py-3 first:pl-4 last:pr-4"
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow className="hover:bg-transparent">
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center text-muted-foreground"
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<footer className="flex items-center justify-center border-t border-border/60 px-4 py-3">
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon"
						className="size-8"
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
						aria-label="First page"
					>
						<ChevronsLeftIcon className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="size-8"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						aria-label="Previous page"
					>
						<ChevronLeftIcon className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="size-8"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						aria-label="Next page"
					>
						<ChevronRightIcon className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="size-8"
						onClick={() =>
							table.setPageIndex(table.getPageCount() - 1)
						}
						disabled={!table.getCanNextPage()}
						aria-label="Last page"
					>
						<ChevronsRightIcon className="size-4" />
					</Button>
				</div>
			</footer>
		</div>
	);
}

/** Soft pill used for numeric / compact metric cells (matches reference table). */
export function DataTableValuePill({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex min-w-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-sm tabular-nums text-foreground",
				className,
			)}
		>
			{children}
		</span>
	);
}

/** Muted type / category badge. */
export function DataTableTypeBadge({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
				className,
			)}
		>
			{children}
		</span>
	);
}
