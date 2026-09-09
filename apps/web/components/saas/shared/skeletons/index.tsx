"use client";

import { Skeleton } from "@repo/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { cn } from "@repo/ui/utils";
import { PAGE_SIZE } from "@/components/saas/shared/Pagination";

export type TableSkeletonColumn =
	| { type: "avatar"; className?: string }
	| { type: "text"; width?: string; className?: string }
	| { type: "lines"; widths?: string[]; className?: string }
	| { type: "pill"; className?: string }
	| { type: "action"; className?: string };

function CellSkeleton({ column }: { column: TableSkeletonColumn }) {
	switch (column.type) {
		case "avatar":
			return (
				<div
					className={cn(
						"flex items-center gap-2",
						column.className,
					)}
				>
					<Skeleton className="size-10 shrink-0 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-3 w-48" />
					</div>
				</div>
			);
		case "lines":
			return (
				<div className={cn("space-y-2", column.className)}>
					{(column.widths ?? ["w-40", "w-28"]).map((width, i) => (
						<Skeleton
							key={`${width}-${i}`}
							className={cn("h-3", width)}
						/>
					))}
				</div>
			);
		case "pill":
			return (
				<Skeleton
					className={cn("h-6 w-16 rounded-lg", column.className)}
				/>
			);
		case "action":
			return (
				<div className={cn("flex justify-end", column.className)}>
					<Skeleton className="size-9 rounded-md" />
				</div>
			);
		default:
			return (
				<Skeleton
					className={cn(
						"h-4",
						column.width ?? "w-24",
						column.className,
					)}
				/>
			);
	}
}

/** Table body (and optional header) skeleton matching SaaS data tables. */
export function TableBodySkeleton({
	columns,
	rows = PAGE_SIZE,
	headers,
	className,
}: {
	columns: TableSkeletonColumn[];
	rows?: number;
	headers?: string[];
	className?: string;
}) {
	return (
		<div
			role="status"
			aria-label="Loading"
			className={cn("overflow-x-auto scrollbar-none", className)}
		>
			<Table>
				{headers && headers.length > 0 ? (
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							{headers.map((header, index) => (
								<TableHead
									key={`${header}-${index}`}
									className={
										columns[index]?.type === "action"
											? "text-right"
											: undefined
									}
								>
									{header}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
				) : null}
				<TableBody>
					{Array.from({ length: rows }).map((_, rowIndex) => (
						<TableRow key={`skeleton-row-${rowIndex}`}>
							{columns.map((column, colIndex) => (
								<TableCell
									key={`skeleton-cell-${rowIndex}-${colIndex}`}
									className="py-3"
								>
									<CellSkeleton column={column} />
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

/** Resource card grid matching ResourcePage layout. */
export function ResourceCardsSkeleton({
	count = 6,
	className,
}: {
	count?: number;
	className?: string;
}) {
	return (
		<div
			role="status"
			aria-label="Loading"
			className={cn(
				"grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
				className,
			)}
		>
			{Array.from({ length: count }).map((_, index) => (
				<div
					key={`resource-skeleton-${index}`}
					className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
				>
					<div className="flex items-start justify-between gap-3">
						<Skeleton className="size-10 rounded-xl" />
						<Skeleton className="size-8 rounded-md" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-5 w-2/3" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-4/5" />
					</div>
					<div className="mt-auto pt-1">
						<Skeleton className="h-6 w-16 rounded-lg" />
					</div>
				</div>
			))}
		</div>
	);
}

/** Full-page / section stacked skeleton for configure, detail, monitor. */
export function PageSectionSkeleton({
	className,
	variant = "default",
}: {
	className?: string;
	variant?: "default" | "form" | "detail" | "monitor";
}) {
	if (variant === "form") {
		return (
			<div
				role="status"
				aria-label="Loading"
				className={cn(
					"mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-6",
					className,
				)}
			>
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-72" />
				</div>
				<div className="grid gap-6 lg:grid-cols-[1fr_360px]">
					<div className="space-y-4 rounded-2xl border bg-card p-6">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-5 w-28" />
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-5 w-36" />
						<Skeleton className="h-10 w-full" />
						<div className="flex gap-3 pt-2">
							<Skeleton className="h-10 w-28" />
							<Skeleton className="h-10 w-24" />
						</div>
					</div>
					<div className="space-y-4 rounded-2xl border bg-card p-6">
						<Skeleton className="h-5 w-24" />
						<Skeleton className="h-40 w-full rounded-xl" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
			</div>
		);
	}

	if (variant === "detail") {
		return (
			<div
				role="status"
				aria-label="Loading"
				className={cn(
					"mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-6",
					className,
				)}
			>
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-48" />
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`detail-stat-${i}`}
							className="space-y-3 rounded-2xl border bg-card p-5"
						>
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-7 w-28" />
						</div>
					))}
				</div>
				<div className="space-y-4 rounded-2xl border bg-card p-6">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-5/6" />
					<Skeleton className="h-4 w-4/5" />
					<Skeleton className="h-4 w-3/4" />
				</div>
			</div>
		);
	}

	if (variant === "monitor") {
		return (
			<div
				role="status"
				aria-label="Loading"
				className={cn(
					"mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-6",
					className,
				)}
			>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="space-y-2">
						<Skeleton className="h-8 w-56" />
						<Skeleton className="h-4 w-72" />
					</div>
					<Skeleton className="h-9 w-36" />
				</div>
				<StatCardsSkeleton count={4} />
				<div className="grid gap-4 lg:grid-cols-2">
					<ChartCardSkeleton />
					<ChartCardSkeleton height="h-48" />
				</div>
			</div>
		);
	}

	return (
		<div
			role="status"
			aria-label="Loading"
			className={cn("space-y-4 p-6", className)}
		>
			<Skeleton className="h-5 w-40" />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-5/6" />
			<Skeleton className="h-4 w-2/3" />
			<div className="flex gap-3 pt-2">
				<Skeleton className="h-9 w-24" />
				<Skeleton className="h-9 w-24" />
			</div>
		</div>
	);
}

/** Dashboard / monitor stat card row. */
export function StatCardsSkeleton({
	count = 4,
	className,
}: {
	count?: number;
	className?: string;
}) {
	return (
		<div
			role="status"
			aria-label="Loading"
			className={cn(
				"grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				className,
			)}
		>
			{Array.from({ length: count }).map((_, i) => (
				<div
					key={`stat-skeleton-${i}`}
					className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm"
				>
					<div className="flex items-center justify-between">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="size-8 rounded-lg" />
					</div>
					<Skeleton className="h-8 w-20" />
					<Skeleton className="h-3 w-16" />
				</div>
			))}
		</div>
	);
}

/** Chart / analytics card placeholder. */
export function ChartCardSkeleton({
	className,
	height = "h-56",
}: {
	className?: string;
	height?: string;
}) {
	return (
		<div
			role="status"
			aria-label="Loading"
			className={cn(
				"space-y-4 rounded-2xl border bg-card p-5 shadow-sm",
				className,
			)}
		>
			<div className="flex items-center justify-between">
				<Skeleton className="h-5 w-36" />
				<Skeleton className="h-8 w-24" />
			</div>
			<Skeleton className={cn("w-full rounded-xl", height)} />
		</div>
	);
}

/** Compact inline skeleton (device pickers, combobox triggers). */
export function InlineSkeleton({
	className,
	lines = 1,
}: {
	className?: string;
	lines?: number;
}) {
	return (
		<div
			role="status"
			aria-label="Loading"
			className={cn("space-y-2", className)}
		>
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={`inline-skeleton-${i}`}
					className={cn("h-4", i === 0 ? "w-40" : "w-28")}
				/>
			))}
		</div>
	);
}

/** Simple list-row skeletons for panels without table chrome. */
export function ListRowsSkeleton({
	rows = 5,
	className,
}: {
	rows?: number;
	className?: string;
}) {
	return (
		<div
			role="status"
			aria-label="Loading"
			className={cn("space-y-3 p-4", className)}
		>
			{Array.from({ length: rows }).map((_, i) => (
				<div
					key={`list-row-${i}`}
					className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-4"
				>
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-3 w-56" />
					</div>
					<Skeleton className="h-8 w-20 rounded-md" />
				</div>
			))}
		</div>
	);
}
