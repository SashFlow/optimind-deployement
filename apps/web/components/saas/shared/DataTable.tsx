"use client";

import { Checkbox } from "@repo/ui/checkbox";
import { TableHead, TableRow } from "@repo/ui/table";
import { cn } from "@repo/ui/utils";
import { UserAvatar } from "@shared/components/UserAvatar";
import type { ReactNode } from "react";

export function DataTableShell({
	toolbar,
	bulkBar,
	children,
	footer,
	className,
}: {
	toolbar?: ReactNode;
	bulkBar?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5",
				className,
			)}
		>
			{bulkBar ? (
				<div className="shrink-0 border-b bg-muted/40 px-5 py-3">
					{bulkBar}
				</div>
			) : toolbar ? (
				<div className="flex shrink-0 flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
					{toolbar}
				</div>
			) : null}
			{children}
			{footer ? (
				<footer className="shrink-0 border-t px-5 py-3">
					{footer}
				</footer>
			) : null}
		</div>
	);
}

export function DataTableBody({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"min-h-0 flex-1 overflow-auto scrollbar-none",
				className,
			)}
		>
			{children}
		</div>
	);
}

export function DataTableBulkBar({
	count,
	onClear,
	children,
}: {
	count: number;
	onClear: () => void;
	children: ReactNode;
}) {
	return (
		<div className="flex w-full flex-wrap items-center gap-3">
			<p className="text-sm font-medium">
				{count} selected
				<button
					type="button"
					className="ml-2 text-muted-foreground underline-offset-2 hover:underline"
					onClick={onClear}
				>
					Clear
				</button>
			</p>
			<div className="flex flex-wrap items-center gap-2">{children}</div>
		</div>
	);
}

export function SelectAllCheckbox({
	allSelected,
	someSelected,
	onToggle,
	disabled,
}: {
	allSelected: boolean;
	someSelected: boolean;
	onToggle: (checked: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<Checkbox
			checked={
				allSelected ? true : someSelected ? "indeterminate" : false
			}
			disabled={disabled}
			onCheckedChange={(value) => onToggle(value === true)}
			aria-label="Select all on page"
		/>
	);
}

export function RowCheckbox({
	checked,
	onToggle,
	label,
}: {
	checked: boolean;
	onToggle: () => void;
	label: string;
}) {
	return (
		<Checkbox
			checked={checked}
			onCheckedChange={() => onToggle()}
			aria-label={label}
			onClick={(event) => event.stopPropagation()}
		/>
	);
}

export function IdentityCell({
	name,
	secondary,
	showAvatar = true,
}: {
	name: string;
	secondary?: string | null;
	showAvatar?: boolean;
}) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			{showAvatar ? (
				<UserAvatar name={name} className="size-8 shrink-0" />
			) : null}
			<div className="min-w-0">
				<p className="truncate font-medium text-foreground">{name}</p>
				{secondary ? (
					<p className="truncate text-sm text-muted-foreground">
						{secondary}
					</p>
				) : null}
			</div>
		</div>
	);
}

const STATUS_TONE: Record<string, string> = {
	active: "bg-emerald-50 text-emerald-700",
	invited: "bg-violet-50 text-violet-700",
	inactive: "bg-slate-100 text-slate-600",
	disabled: "bg-slate-100 text-slate-600",
	completed: "bg-slate-50 text-slate-700",
	failed: "bg-rose-50 text-rose-700",
	pending: "bg-amber-50 text-amber-700",
	processing: "bg-amber-50 text-amber-700",
	running: "bg-sky-50 text-sky-700",
	retrying: "bg-amber-50 text-amber-700",
	cancelled: "bg-slate-50 text-slate-700",
	queued: "bg-emerald-50 text-emerald-700",
	ready: "bg-emerald-50 text-emerald-700",
	trial: "bg-violet-50 text-violet-700",
	workspace: "bg-slate-50 text-slate-700",
	expired: "bg-slate-100 text-slate-600",
	exhausted: "bg-rose-50 text-rose-700",
};

export function StatusBadge({
	label,
	tone,
	className,
}: {
	label: string;
	tone?: string;
	className?: string;
}) {
	const key = (tone ?? label).toLowerCase();
	return (
		<span
			className={cn(
				"inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
				STATUS_TONE[key] ?? "bg-slate-50 text-slate-700",
				className,
			)}
		>
			{label}
		</span>
	);
}

export function dataTableRowClass(selected?: boolean) {
	return cn(
		"group/row",
		selected &&
			"bg-primary/5 hover:bg-primary/10 data-[state=selected]:bg-primary/5",
	);
}

export function SelectColumnHead({
	allSelected,
	someSelected,
	onToggle,
	disabled,
}: {
	allSelected: boolean;
	someSelected: boolean;
	onToggle: (checked: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<TableHead className="w-10 px-3">
			<SelectAllCheckbox
				allSelected={allSelected}
				someSelected={someSelected}
				onToggle={onToggle}
				disabled={disabled}
			/>
		</TableHead>
	);
}

export function DataTableHeaderRow({ children }: { children: ReactNode }) {
	return <TableRow className="hover:bg-transparent">{children}</TableRow>;
}
