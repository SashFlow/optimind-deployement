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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { Textarea } from "@repo/ui/textarea";
import { cn } from "@repo/ui/utils";
import { MoreVerticalIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useClientInfiniteScroll } from "@/components/saas/shared/Pagination";
import { ResourceCardsSkeleton } from "@/components/saas/shared/skeletons";

export type ResourceItem = {
	id: string;
	title: string;
	description: string;
	status: string;
	owner?: "me" | "team";
	meta?: string;
	icon?: React.ReactNode;
	href?: string;
	onEdit?: (name: string, description: string) => void | Promise<void>;
	onDelete?: () => void | Promise<void>;
};

export type ResourceEmptyState = {
	icon: React.ReactNode;
	title: string;
	description: string;
	action?: React.ReactNode;
};

type ResourcePageProps = {
	items: ResourceItem[];
	searchPlaceholder: string;
	sortOptions?: { label: string; value: string }[];
	createAction?: React.ReactNode;
	empty: ResourceEmptyState;
	className?: string;
	isLoading?: boolean;
};

const defaultSortOptions = [
	{ label: "Last modified", value: "modified" },
	{ label: "Name", value: "name" },
];

function statusDotClass(status: string) {
	const normalized = status.trim().toLowerCase();

	if (
		normalized === "published" ||
		normalized === "active" ||
		normalized === "connected"
	) {
		return "bg-emerald-500";
	}

	if (
		normalized === "draft" ||
		normalized === "drafts" ||
		normalized === "available"
	) {
		return "bg-violet-500";
	}

	if (normalized === "inactive" || normalized === "error") {
		return "bg-rose-500";
	}

	return "bg-muted-foreground";
}

const iconAccentPalettes = [
	"bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
	"bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200",
	"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
	"bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200",
	"bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200",
	"bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-200",
	"bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-200",
	"bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-200",
	"bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200",
	"bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-200",
] as const;

function iconAccentClass(seed: string) {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	}
	return iconAccentPalettes[hash % iconAccentPalettes.length];
}

function ResourceCard({ item }: { item: ResourceItem }) {
	const router = useRouter();
	const [editOpen, setEditOpen] = React.useState(false);
	const [editName, setEditName] = React.useState(item.title);
	const [editDescription, setEditDescription] = React.useState(
		item.description,
	);
	const [saving, setSaving] = React.useState(false);
	const [confirmDelete, setConfirmDelete] = React.useState(false);
	const [deleting, setDeleting] = React.useState(false);
	const isInteractive = Boolean(item.href);
	const hasActions = Boolean(item.href || item.onEdit || item.onDelete);

	function openEditDialog() {
		setEditName(item.title);
		setEditDescription(item.description);
		setEditOpen(true);
	}

	async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!item.onEdit) return;

		const trimmedName = editName.trim();
		if (!trimmedName) return;

		setSaving(true);
		try {
			await item.onEdit(trimmedName, editDescription.trim());
			setEditOpen(false);
		} finally {
			setSaving(false);
		}
	}

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
					"group flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-colors",
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
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 flex-1 space-y-1.5">
						<h3 className="truncate text-base font-semibold tracking-tight text-foreground">
							{item.title}
						</h3>
						<p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
							{item.description || "No description"}
						</p>
					</div>

					<div
						className={cn(
							"flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
							iconAccentClass(item.id),
						)}
						aria-hidden
					>
						{item.icon ?? (
							<span className="text-base font-semibold uppercase">
								{item.title.charAt(0) || "?"}
							</span>
						)}
					</div>
				</div>

				<div className="mt-auto flex items-center justify-between gap-3 pt-2">
					<div className="flex min-w-0 flex-wrap items-center gap-3">
						<span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
							<span
								className={cn(
									"size-2 shrink-0 rounded-full",
									statusDotClass(item.status),
								)}
								aria-hidden
							/>
							<span className="capitalize">{item.status}</span>
						</span>

						{item.meta ? (
							<span className="text-xs text-muted-foreground">
								Updated {item.meta}
							</span>
						) : null}
					</div>

					{hasActions ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									aria-label={`Actions for ${item.title}`}
									className="size-7 shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
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
								{item.onEdit ? (
									<DropdownMenuItem onClick={openEditDialog}>
										Edit
									</DropdownMenuItem>
								) : null}
								{item.onDelete ? (
									<>
										{item.href || item.onEdit ? (
											<DropdownMenuSeparator />
										) : null}
										<DropdownMenuItem
											className="text-destructive focus:text-destructive"
											onClick={() =>
												setConfirmDelete(true)
											}
										>
											Delete
										</DropdownMenuItem>
									</>
								) : null}
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>
			</div>

			{item.onEdit ? (
				<Dialog open={editOpen} onOpenChange={setEditOpen}>
					<DialogContent
						className="max-w-md"
						onClick={(event) => event.stopPropagation()}
					>
						<DialogHeader>
							<DialogTitle>Edit {item.title}</DialogTitle>
							<DialogDescription>
								Update the name and description for this
								resource.
							</DialogDescription>
						</DialogHeader>
						<form className="space-y-4" onSubmit={handleEdit}>
							<div className="space-y-2">
								<Label htmlFor={`edit-name-${item.id}`}>
									Name
								</Label>
								<Input
									id={`edit-name-${item.id}`}
									value={editName}
									onChange={(event) =>
										setEditName(event.target.value)
									}
									placeholder="Name"
									autoFocus
									required
									disabled={saving}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`edit-description-${item.id}`}>
									Description (optional)
								</Label>
								<Textarea
									id={`edit-description-${item.id}`}
									value={editDescription}
									onChange={(event) =>
										setEditDescription(event.target.value)
									}
									placeholder="Optional description"
									rows={3}
									disabled={saving}
								/>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditOpen(false)}
									disabled={saving}
								>
									Cancel
								</Button>
								<Button type="submit" loading={saving}>
									Save changes
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			) : null}

			{item.onDelete ? (
				<AlertDialog
					open={confirmDelete}
					onOpenChange={setConfirmDelete}
				>
					<AlertDialogContent
						onClick={(event) => event.stopPropagation()}
					>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Delete {item.title}?
							</AlertDialogTitle>
							<AlertDialogDescription>
								This will remove this resource from your
								workspace. This action cannot be undone.
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
	items,
	searchPlaceholder,
	sortOptions = defaultSortOptions,
	createAction,
	empty,
	className,
	isLoading = false,
}: ResourcePageProps) {
	const [search, setSearch] = React.useState("");
	const [sort, setSort] = React.useState(sortOptions[0]?.value ?? "modified");

	const visibleItems = React.useMemo(() => {
		const query = search.trim().toLowerCase();
		const filtered = items.filter((item) => {
			return (
				!query ||
				item.title.toLowerCase().includes(query) ||
				item.description.toLowerCase().includes(query)
			);
		});

		return [...filtered].sort((a, b) => {
			if (sort === "name") {
				return a.title.localeCompare(b.title);
			}

			return a.id.localeCompare(b.id);
		});
	}, [items, search, sort]);

	const {
		visibleItems: renderedItems,
		hasMore,
		sentinelRef,
	} = useClientInfiniteScroll(visibleItems);

	const emptyTitle =
		items.length > 0 && visibleItems.length === 0
			? "No matching items"
			: empty.title;
	const emptyDescription =
		items.length > 0 && visibleItems.length === 0
			? "Try changing your search."
			: empty.description;

	return (
		<section
			className={cn("mx-auto w-full max-w-[1600px] space-y-6", className)}
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center justify-end">
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

			{isLoading ? (
				<ResourceCardsSkeleton />
			) : visibleItems.length === 0 ? (
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
				<div className="space-y-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{renderedItems.map((item) => (
							<ResourceCard key={item.id} item={item} />
						))}
					</div>
					{hasMore ? (
						<div
							ref={sentinelRef}
							className="h-1 w-full"
							aria-hidden
						/>
					) : null}
				</div>
			)}
		</section>
	);
}
