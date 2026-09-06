"use client";

import { Button } from "@repo/ui/button";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
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
	return "bg-slate-50 text-slate-700";
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
	const router = useRouter();
	const [activeFilter, setActiveFilter] = React.useState(
		filters[0]?.value ?? "all",
	);
	const [search, setSearch] = React.useState("");
	const [sort, setSort] = React.useState(sortOptions[0]?.value ?? "modified");

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
			if (sort === "name") return a.title.localeCompare(b.title);
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
			<div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
				<div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<div className="relative min-w-0 sm:w-72">
							<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder={searchPlaceholder}
								aria-label={searchPlaceholder}
								className="pl-9"
							/>
						</div>
						<Select value={activeFilter} onValueChange={setActiveFilter}>
							<SelectTrigger className="w-full sm:w-44">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{filters.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label} ({option.count})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={sort} onValueChange={setSort}>
							<SelectTrigger className="w-full sm:w-44">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{sortOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{createAction ? (
						<div className="flex items-center gap-2 lg:justify-end">
							{createAction}
						</div>
					) : null}
				</div>

				{visibleItems.length === 0 ? (
					<div className="space-y-3 p-6">
						<p className="font-medium text-foreground text-sm">{emptyTitle}</p>
						<p className="text-muted-foreground text-sm">{emptyDescription}</p>
						{empty.action ? <div>{empty.action}</div> : null}
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>Name</TableHead>
									<TableHead>Details</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-12">
										<span className="sr-only">Actions</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{visibleItems.map((item) => (
									<TableRow
										key={item.id}
										className={item.href ? "cursor-pointer" : undefined}
										onClick={() => {
											if (item.href) router.push(item.href);
										}}
									>
										<TableCell>
											<div className="flex min-w-0 items-center gap-3">
												{item.icon ? (
													<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
														{item.icon}
													</div>
												) : null}
												<div className="min-w-0">
													<p className="truncate font-medium">{item.title}</p>
													<p className="truncate text-muted-foreground text-sm">
														{item.description}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell className="text-muted-foreground">
											{item.meta ?? "—"}
										</TableCell>
										<TableCell>
											<span
												className={cn(
													"inline-flex rounded-md px-2 py-0.5 font-medium text-xs",
													statusPillClass(item.status),
												)}
											>
												{item.status}
											</span>
										</TableCell>
										<TableCell>
											{(item.href || item.actionLabel) && (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															aria-label={`Actions for ${item.title}`}
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
													</DropdownMenuContent>
												</DropdownMenu>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</section>
	);
}
