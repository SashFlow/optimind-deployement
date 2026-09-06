/** biome-ignore-all lint/style/useBlockStatements: <explanation> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { Button, buttonVariants } from "@repo/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { Input } from "@repo/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { cn } from "@repo/ui/utils";
import { MoreVerticalIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

export type ResourceFilter = {
	label: string;
	value: string;
	count: number;
};

export type ResourceItem = {
	id: string;
	title: string;
	description: string;
	status: string;
	filterKey: string;
	owner?: "me" | "team";
	meta?: string;
	icon?: React.ReactNode;
	actionLabel?: string;
	href?: string;
	onDelete?: () => void | Promise<void>;
};

export type ResourceEmptyState = {
	icon: React.ReactNode;
	title: string;
	description: string;
	action?: React.ReactNode;
};

type ResourcePageProps = {
	filters: ResourceFilter[];
	items: ResourceItem[];
	searchPlaceholder: string;
	sortOptions?: { label: string; value: string }[];
	createAction?: React.ReactNode;
	empty: ResourceEmptyState;
	className?: string;
};

const defaultSortOptions = [
	{ label: "Last modified", value: "modified" },
	{ label: "Name", value: "name" },
];

function statusPillClass(status: string) {
	const normalized = status.trim().toLowerCase();

	if (
		normalized === "published" ||
		normalized === "active" ||
		normalized === "connected"
	) {
		return "bg-emerald-50 text-emerald-700";
	}

	if (
		normalized === "draft" ||
		normalized === "drafts" ||
		normalized === "available"
	) {
		return "bg-violet-50 text-violet-700";
	}

	if (normalized === "inactive" || normalized === "error") {
		return "bg-rose-50 text-rose-700";
	}

	return "bg-muted text-muted-foreground";
}

function ResourceCard({ item }: { item: ResourceItem }) {
	const router = useRouter();
	const [confirmDelete, setConfirmDelete] = React.useState(false);
	const [deleting, setDeleting] = React.useState(false);
	const isInteractive = Boolean(item.href);
	const hasActions = Boolean(item.href || item.actionLabel || item.onDelete);

	async function handleDelete() {
		if (!item.onDelete) return;
		setDeleting(true);
		try {
			await item.onDelete();
			setConfirmDelete(false);
		} finally {
			setDeleting(false);
		}
	}

	return (
		<>
			<div
				role={isInteractive ? "link" : undefined}
				tabIndex={isInteractive ? 0 : undefined}
				className={cn(
					"group flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-colors",
					isInteractive &&
					"cursor-pointer hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				)}
				onClick={() => {
					if (item.href) router.push(item.href);
				}}
				onKeyDown={(event) => {
					if (!item.href) return;
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						router.push(item.href);
					}
				}}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200">
						{item.icon ?? (
							<span className="text-sm font-semibold uppercase">
								{item.title.charAt(0) || "?"}
							</span>
						)}
					</div>

					{hasActions ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									aria-label={`Actions for ${item.title}`}
									className="text-muted-foreground"
									onClick={(event) => event.stopPropagation()}
								>
									<MoreVerticalIcon className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								onClick={(event) => event.stopPropagation()}
							>
								{item.href ? (
									<DropdownMenuItem asChild>
										<Link href={item.href}>Open</Link>
									</DropdownMenuItem>
								) : null}
								{item.actionLabel ? (
									<DropdownMenuItem>
										{item.actionLabel}
									</DropdownMenuItem>
								) : null}
								{item.onDelete ? (
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() => setConfirmDelete(true)}
									>
										Delete
									</DropdownMenuItem>
								) : null}
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>

				<div className="min-w-0 space-y-1.5">
					<h3 className="truncate text-base font-semibold tracking-tight text-foreground">
						{item.title}
					</h3>
					<p className="line-clamp-2 text-sm text-muted-foreground">
						{item.description}
					</p>
				</div>

				<div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
					<span
						className={cn(
							"inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium capitalize",
							statusPillClass(item.status),
						)}
					>
						{item.status}
					</span>
				</div>
			</div>

			{item.onDelete ? (
				<AlertDialog
					open={confirmDelete}
					onOpenChange={setConfirmDelete}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Delete {item.title}?
							</AlertDialogTitle>
							<AlertDialogDescription>
								This will remove this resource from your
								workspace.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={deleting}>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								className={buttonVariants({
									variant: "destructive",
								})}
								disabled={deleting}
								onClick={(event) => {
									event.preventDefault();
									void handleDelete();
								}}
							>
								{deleting ? "Deleting…" : "Delete"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			) : null}
		</>
	);
}

export function ResourcePage({
	filters,
	items,
	searchPlaceholder,
	sortOptions = defaultSortOptions,
	createAction,
	empty,
	className,
}: ResourcePageProps) {
	const [activeFilter, setActiveFilter] = React.useState(
		filters[0]?.value ?? "all",
	);
	const [search, setSearch] = React.useState("");
	const [sort, setSort] = React.useState(sortOptions[0]?.value ?? "modified");

	const filterItems = React.useMemo(
		() =>
			filters.map((filter) => ({
				value: filter.value,
				label: `${filter.label} (${filter.count})`,
			})),
		[filters],
	);

	const visibleItems = React.useMemo(() => {
		const query = search.trim().toLowerCase();
		const filtered = items.filter((item) => {
			const matchesFilter =
				activeFilter === "all" || item.filterKey === activeFilter;
			const matchesSearch =
				!query ||
				item.title.toLowerCase().includes(query) ||
				item.description.toLowerCase().includes(query);

			return matchesFilter && matchesSearch;
		});

		return [...filtered].sort((a, b) => {
			if (sort === "name") {
				return a.title.localeCompare(b.title);
			}

			return a.id.localeCompare(b.id);
		});
	}, [activeFilter, items, search, sort]);

	const emptyTitle =
		items.length > 0 && visibleItems.length === 0
			? "No matching items"
			: empty.title;
	const emptyDescription =
		items.length > 0 && visibleItems.length === 0
			? "Try changing your search or filters."
			: empty.description;

	return (
		<section
			className={cn(
				"mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-6",
				className,
			)}
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
					<div className="relative min-w-0 sm:max-w-xs sm:flex-1">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder={searchPlaceholder}
							aria-label={searchPlaceholder}
							className="bg-white pl-9 dark:bg-card"
						/>
					</div>
					<Select
						value={activeFilter}
						onValueChange={(value) => {
							if (value) setActiveFilter(value);
						}}
					>
						<SelectTrigger className="w-full bg-white sm:w-40 dark:bg-card">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{filterItems.map((option) => (
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
						value={sort}
						onValueChange={(value) => {
							if (value) setSort(value);
						}}
					>
						<SelectTrigger className="w-full bg-white sm:w-40 dark:bg-card">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{sortOptions.map((option) => (
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

				{createAction ? (
					<div className="flex shrink-0 items-center gap-2 sm:justify-end">
						{createAction}
					</div>
				) : null}
			</div>

			{visibleItems.length === 0 ? (
				<div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border/80 bg-card/50 px-6 py-12">
					{empty.icon ? (
						<div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground [&>svg]:size-5">
							{empty.icon}
						</div>
					) : null}
					<div className="space-y-1">
						<p className="text-sm font-medium text-foreground">
							{emptyTitle}
						</p>
						<p className="text-sm text-muted-foreground">
							{emptyDescription}
						</p>
					</div>
					{empty.action ? <div>{empty.action}</div> : null}
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{visibleItems.map((item) => (
						<ResourceCard key={item.id} item={item} />
					))}
				</div>
			)}
		</section>
	);
}
