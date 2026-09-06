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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { cn } from "@repo/ui/utils";
import { formatDistanceToNow } from "date-fns";
import { MoreVerticalIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import { Pagination } from "@/components/saas/shared/Pagination";
import type {
	KnowledgeDocument,
	KnowledgeDocumentStatus,
} from "@/services/api/types";

type StatusFilter = "all" | KnowledgeDocumentStatus;

const ITEMS_PER_PAGE = 10;

const STATUS_FILTER_ITEMS: { value: StatusFilter; label: string }[] = [
	{ value: "all", label: "All statuses" },
	{ value: "READY", label: "Ready" },
	{ value: "PENDING", label: "Pending" },
	{ value: "PROCESSING", label: "Processing" },
	{ value: "FAILED", label: "Failed" },
];

function statusPillClass(status: string) {
	if (status === "READY") {
		return "bg-emerald-50 text-emerald-700";
	}
	if (status === "PENDING" || status === "PROCESSING") {
		return "bg-amber-50 text-amber-700";
	}
	if (status === "FAILED") {
		return "bg-rose-50 text-rose-700";
	}
	return "bg-slate-50 text-slate-700";
}

function sourceLabel(sourceType: KnowledgeDocument["sourceType"]) {
	switch (sourceType) {
		case "TEXT":
			return "Text";
		case "URL":
			return "URL";
		case "UPLOAD":
			return "Upload";
		case "API":
			return "API";
		default:
			return sourceType;
	}
}

type KnowledgeDocumentsTableProps = {
	documents: KnowledgeDocument[];
	isLoading?: boolean;
	isError?: boolean;
	isDeleting?: boolean;
	onAddDocument: () => void;
	onDeleteDocument: (documentId: string) => Promise<void> | void;
};

export function KnowledgeDocumentsTable({
	documents,
	isLoading = false,
	isError = false,
	isDeleting = false,
	onAddDocument,
	onDeleteDocument,
}: KnowledgeDocumentsTableProps) {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [pendingDelete, setPendingDelete] =
		useState<KnowledgeDocument | null>(null);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		return documents.filter((doc) => {
			if (statusFilter !== "all" && doc.status !== statusFilter) {
				return false;
			}
			if (!query) {
				return true;
			}
			return (
				doc.title.toLowerCase().includes(query) ||
				(doc.sourceUrl?.toLowerCase().includes(query) ?? false)
			);
		});
	}, [documents, search, statusFilter]);

	useEffect(() => {
		setCurrentPage(1);
	}, [search, statusFilter]);

	const pageItems = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filtered.slice(start, start + ITEMS_PER_PAGE);
	}, [filtered, currentPage]);

	async function handleDelete() {
		if (!pendingDelete) {
			return;
		}
		await onDeleteDocument(pendingDelete.id);
		setPendingDelete(null);
	}

	return (
		<>
			<div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
				<div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h2 className="font-semibold text-lg">Documents</h2>
						<p className="text-muted-foreground text-sm">
							Manage sources ingested into this knowledge base.
						</p>
					</div>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<div className="relative min-w-0 sm:w-64">
							<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) =>
									setSearch(event.target.value)
								}
								placeholder="Search documents…"
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
									<SelectItem
										key={option.value}
										value={option.value}
									>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							type="button"
							className="rounded-full"
							onClick={onAddDocument}
						>
							<PlusIcon className="size-4" />
							Add document
						</Button>
					</div>
				</div>

				{isLoading ? (
					<LoadingState />
				) : isError ? (
					<p className="p-6 text-destructive text-sm">
						Failed to load documents.
					</p>
				) : filtered.length === 0 ? (
					<p className="p-6 text-muted-foreground text-sm">
						No documents found. Add a text source or URL to get
						started.
					</p>
				) : (
					<>
						<div className="overflow-x-auto scrollbar-none">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>Title</TableHead>
										<TableHead>Source</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Updated</TableHead>
										<TableHead className="text-right">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{pageItems.map((doc) => (
										<TableRow key={doc.id}>
											<TableCell>
												<p className="font-medium text-sm">
													{doc.title}
												</p>
												{doc.errorMessage ? (
													<p className="mt-0.5 text-rose-600 text-xs">
														{doc.errorMessage}
													</p>
												) : null}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												<span>
													{sourceLabel(
														doc.sourceType,
													)}
												</span>
												{doc.sourceUrl ? (
													<p className="mt-0.5 max-w-[240px] truncate text-xs">
														{doc.sourceUrl}
													</p>
												) : null}
											</TableCell>
											<TableCell>
												<span
													className={cn(
														"inline-flex rounded-md px-2 py-0.5 font-medium text-xs",
														statusPillClass(
															doc.status,
														),
													)}
												>
													{doc.status}
												</span>
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{formatDistanceToNow(
													new Date(doc.updatedAt),
													{ addSuffix: true },
												)}
											</TableCell>
											<TableCell className="text-right">
												<DropdownMenu>
													<DropdownMenuTrigger
														asChild
													>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															aria-label="Document actions"
														>
															<MoreVerticalIcon className="size-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															className="text-destructive focus:text-destructive"
															onClick={() =>
																setPendingDelete(
																	doc,
																)
															}
														>
															Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
						<footer className="border-t px-5 py-3">
							<Pagination
								totalItems={filtered.length}
								itemsPerPage={ITEMS_PER_PAGE}
								currentPage={currentPage}
								onChangeCurrentPage={setCurrentPage}
							/>
						</footer>
					</>
				)}
			</div>

			<AlertDialog
				open={!!pendingDelete}
				onOpenChange={(open) => {
					if (!open) {
						setPendingDelete(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {pendingDelete?.title}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove the document from this knowledge
							base. You can add it again later if needed.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className={buttonVariants({
								variant: "destructive",
							})}
							disabled={isDeleting}
							onClick={(event) => {
								event.preventDefault();
								void handleDelete();
							}}
						>
							{isDeleting ? "Deleting…" : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
