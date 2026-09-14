"use client";

import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
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
	type RowSelectionState,
	type SortingState,
} from "@tanstack/react-table";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronsLeftIcon,
	ChevronsRightIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

export type DataTableBulkBarContext<TData> = {
	selectedRows: TData[];
	selectedCount: number;
	clearSelection: () => void;
};

export type StandardDataTableProps<TData, TValue = unknown> = {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	toolbar?: ReactNode;
	/** Shown in place of toolbar when one or more rows are selected. */
	bulkBar?: (ctx: DataTableBulkBarContext<TData>) => ReactNode;
	/** Fires whenever the selected row set changes. */
	onSelectionChange?: (ctx: DataTableBulkBarContext<TData>) => void;
	emptyMessage?: string;
	className?: string;
	/** Initial rows per page. Defaults to 10. */
	pageSize?: number;
	enableRowSelection?: boolean;
	getRowId?: (row: TData, index: number) => string;
	/** Optional per-row className (e.g. highlight the active organization). */
	getRowClassName?: (row: TData) => string | undefined;
	showPagination?: boolean;
	/**
	 * When false, omit the card chrome so the table can sit on a parent
	 * backdrop (e.g. FolderTabs muted panel). Defaults to true.
	 */
	framed?: boolean;
};

function createSelectionColumn<TData>(): ColumnDef<TData, unknown> {
	return {
		id: "select",
		size: 40,
		enableSorting: false,
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected()
						? true
						: table.getIsSomePageRowsSelected()
							? "indeterminate"
							: false
				}
				onCheckedChange={(value) =>
					table.toggleAllPageRowsSelected(value === true)
				}
				aria-label="Select all on page"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(value === true)}
				aria-label="Select row"
				onClick={(event) => event.stopPropagation()}
			/>
		),
	};
}

export function StandardDataTable<TData, TValue = unknown>({
	columns,
	data,
	toolbar,
	bulkBar,
	onSelectionChange,
	emptyMessage = "No results.",
	className,
	pageSize: initialPageSize = 10,
	enableRowSelection = false,
	getRowId,
	getRowClassName,
	showPagination = true,
	framed = true,
}: StandardDataTableProps<TData, TValue>) {
	"use no memo";

	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: initialPageSize,
	});

	const tableColumns = useMemo(() => {
		if (!enableRowSelection) return columns;
		return [createSelectionColumn<TData>(), ...columns] as ColumnDef<
			TData,
			TValue
		>[];
	}, [columns, enableRowSelection]);

	const table = useReactTable({
		data,
		columns: tableColumns,
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

	const selectedRows = table
		.getSelectedRowModel()
		.rows.map((row) => row.original);
	const selectedCount = selectedRows.length;
	const clearSelection = () => setRowSelection({});

	useEffect(() => {
		onSelectionChange?.({ selectedRows, selectedCount, clearSelection });
	}, [rowSelection, data]);

	const headerContent =
		selectedCount > 0 && bulkBar
			? bulkBar({ selectedRows, selectedCount, clearSelection })
			: toolbar;

	return (
		<div
			className={cn(
				"flex min-h-0 flex-1 flex-col overflow-hidden",
				framed &&
					"rounded-2xl border border-border/70 bg-card shadow-xs",
				className,
			)}
		>
			{headerContent ? (
				<div
					className={cn(
						"flex min-h-16 shrink-0 items-center border-b border-border/60 px-1 py-3 sm:px-0",
						selectedCount > 0 &&
							bulkBar &&
							(framed ? "bg-muted/40" : "bg-card/70"),
					)}
				>
					{headerContent}
				</div>
			) : null}

			<div
				className={cn(
					"min-h-0 flex-1 overflow-x-auto",
					framed && "px-2 pt-2 sm:px-3",
				)}
			>
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
											width:
												header.getSize() !== 150
													? header.getSize()
													: undefined,
										}}
										className={cn(
											"h-10 px-3 first:rounded-tl-xl last:rounded-tr-xl first:pl-4 last:pr-4",
											"text-xs font-medium text-muted-foreground",
											framed ? "bg-muted/70" : "bg-card",
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
									className={cn(
										"group/row border-border/50",
										row.getIsSelected() &&
											"bg-primary/5 hover:bg-primary/10",
										getRowClassName?.(row.original),
									)}
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
									colSpan={tableColumns.length}
									className="h-24 text-center text-muted-foreground"
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{showPagination ? (
				<footer
					className={cn(
						"flex shrink-0 items-center justify-center border-t border-border/60 py-3",
						framed && "px-4",
					)}
				>
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
			) : null}
		</div>
	);
}

/** Alias matching the shared DataTable naming used across the app. */
export const DataTable = StandardDataTable;

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
