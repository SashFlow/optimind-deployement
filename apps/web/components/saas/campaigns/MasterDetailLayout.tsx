"use client";

import { Button } from "@repo/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { cn } from "@repo/ui/utils";
import { ArrowLeftIcon, InboxIcon } from "lucide-react";
import type { ReactNode } from "react";

export type MasterDetailStatusOption = {
	value: string;
	label: string;
};

export function MasterDetailEmpty({
	title,
	description,
	icon,
	className,
}: {
	title: string;
	description?: string;
	icon?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-1 items-center justify-center p-6",
				className,
			)}
		>
			<div className="flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center">
				<div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground [&>svg]:size-5">
					{icon ?? <InboxIcon />}
				</div>
				<div className="space-y-1">
					<p className="text-sm font-medium text-foreground">
						{title}
					</p>
					{description ? (
						<p className="text-sm text-muted-foreground">
							{description}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}

export function MasterDetailSectionLabel({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<div className="flex items-center gap-3 px-1 py-2">
			<div className="h-px flex-1 bg-border" />
			<span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
				{children}
			</span>
			<div className="h-px flex-1 bg-border" />
		</div>
	);
}

export function MasterDetailListItem({
	selected,
	onClick,
	children,
	className,
}: {
	selected?: boolean;
	onClick?: () => void;
	children: ReactNode;
	className?: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full flex-col gap-1 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm transition-colors",
				"hover:bg-muted/50",
				selected && "border-border bg-muted/60",
				className,
			)}
		>
			{children}
		</button>
	);
}

export function MasterDetailLayout({
	hasSelection,
	onBack,
	statusValue,
	onStatusChange,
	statusOptions,
	statusPlaceholder = "Status",
	listContent,
	listEmpty,
	listLoading,
	detailTitle,
	detailActions,
	detailContent,
	detailEmpty = {
		title: "Nothing Here",
		description: "Select an item to preview.",
	},
	className,
}: {
	hasSelection: boolean;
	onBack: () => void;
	statusValue: string;
	onStatusChange: (value: string) => void;
	statusOptions: MasterDetailStatusOption[];
	statusPlaceholder?: string;
	listContent: ReactNode;
	listEmpty?: ReactNode;
	listLoading?: boolean;
	detailTitle?: ReactNode;
	detailActions?: ReactNode;
	detailContent?: ReactNode;
	detailEmpty?: {
		title: string;
		description?: string;
	};
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex min-h-0 flex-1 overflow-hidden rounded-xl border",
				className,
			)}
		>
			<aside
				className={cn(
					"min-h-0 w-full shrink-0 flex-col border-r md:flex md:w-72 lg:w-80",
					hasSelection ? "hidden" : "flex",
				)}
			>
				<div className="flex h-14 shrink-0 items-center border-b px-3">
					<Select
						value={statusValue}
						onValueChange={(value) => {
							if (value) {
								onStatusChange(value);
							}
						}}
					>
						<SelectTrigger
							aria-label={statusPlaceholder}
							className="h-9 w-full bg-background"
						>
							<SelectValue placeholder={statusPlaceholder} />
						</SelectTrigger>
						<SelectContent>
							{statusOptions.map((option) => (
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

				<div className="min-h-0 flex-1 overflow-y-auto p-2">
					{listLoading ? (
						<p className="px-2 py-4 text-sm text-muted-foreground">
							Loading…
						</p>
					) : listEmpty ? (
						listEmpty
					) : (
						listContent
					)}
				</div>
			</aside>

			<section
				className={cn(
					"min-h-0 min-w-0 flex-1 flex-col md:flex",
					hasSelection ? "flex" : "hidden",
				)}
			>
				<header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-8 shrink-0 md:hidden"
						onClick={onBack}
						aria-label="Back to list"
					>
						<ArrowLeftIcon className="size-4" />
					</Button>
					<div className="min-w-0 flex-1 truncate text-sm font-medium">
						{hasSelection ? detailTitle : null}
					</div>
					{hasSelection && detailActions ? (
						<div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
							{detailActions}
						</div>
					) : null}
				</header>

				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
					{hasSelection ? (
						(detailContent ?? null)
					) : (
						<MasterDetailEmpty
							title={detailEmpty.title}
							description={detailEmpty.description}
						/>
					)}
				</div>
			</section>
		</div>
	);
}
