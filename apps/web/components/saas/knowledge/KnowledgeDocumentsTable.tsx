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
import { formatDistanceToNow } from "date-fns";
import { MoreVerticalIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	DataTableBody,
	DataTableBulkBar,
	DataTableHeaderRow,
	DataTableShell,
	IdentityCell,
	RowCheckbox,
	SelectColumnHead,
	StatusBadge,
	dataTableRowClass,
} from "@/components/saas/shared/DataTable";
import { PAGE_SIZE, Pagination } from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import { useRowSelection } from "@/components/saas/shared/useRowSelection";
import type {
	KnowledgeDocument,
	KnowledgeDocumentStatus,
} from "@/services/api/types";

type StatusFilter = "all" | KnowledgeDocumentStatus;

const STATUS_FILTER_ITEMS: { value: StatusFilter; label: string }[] = [
	{ value: "all", label: "All statuses" },
	{ value: "READY", label: "Ready" },
	{ value: "PENDING", label: "Pending" },
	{ value: "PROCESSING", label: "Processing" },
	{ value: "FAILED", label: "Failed" },
];

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

function documentSecondary(doc: KnowledgeDocument) {
	if (doc.sourceUrl) return doc.sourceUrl;
	return sourceLabel(doc.sourceType);
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
	const [bulkBusy, setBulkBusy] = useState(false);

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

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

	useEffect(() => {
		setCurrentPage(1);
	}, [search, statusFilter]);

	useEffect(() => {
		if (currentPage > pageCount) setCurrentPage(pageCount);
	}, [currentPage, pageCount]);

	const pageItems = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filtered.slice(start, start + PAGE_SIZE);
	}, [filtered, currentPage]);

	const pageIds = useMemo(() => pageItems.map((doc) => doc.id), [pageItems]);
	const selection = useRowSelection(pageIds);

	async function handleDelete() {
		if (!pendingDelete) {
			return;
		}
		await onDeleteDocument(pendingDelete.id);
		selection.clear();
		setPendingDelete(null);
	}

	async function bulkDelete() {
		if (selection.selectedIds.length === 0) return;
		setBulkBusy(true);
		try {
			for (const id of selection.selectedIds) {
				await onDeleteDocument(id);
			}
			selection.clear();
		} finally {
			setBulkBusy(false);
		}
	}

	const toolbar = (
		<>
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
						onChange={(event) => setSearch(event.target.value)}
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
							<SelectItem key={option.value} value={option.value}>
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
		</>
	);

	const bulkBar =
		selection.selectedCount > 0 ? (
			<DataTableBulkBar
				count={selection.selectedCount}
				onClear={selection.clear}
			>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={bulkBusy || isDeleting}
					className="text-destructive"
					onClick={() => {
						void bulkDelete();
					}}
				>
					{bulkBusy ? "Deleting…" : "Delete"}
				</Button>
			</DataTableBulkBar>
		) : null;

	return (
		<>
			<DataTableShell
				toolbar={selection.selectedCount > 0 ? undefined : toolbar}
				bulkBar={bulkBar}
				footer={
					!isLoading && !isError && filtered.length > 0 ? (
						<Pagination
							totalItems={filtered.length}
							itemsPerPage={PAGE_SIZE}
							currentPage={currentPage}
							onChangeCurrentPage={setCurrentPage}
						/>
					) : null
				}
			>
				{isLoading ? (
					<DataTableBody>
						<TableBodySkeleton
							headers={[
								"",
								"Title",
								"Status",
								"Updated",
								"Actions",
							]}
							columns={[
								{ type: "action" },
								{
									type: "lines",
									widths: ["w-40", "w-28"],
								},
								{ type: "pill" },
								{ type: "text", width: "w-24" },
								{ type: "action" },
							]}
						/>
					</DataTableBody>
				) : isError ? (
					<p className="min-h-0 flex-1 p-6 text-destructive text-sm">
						Failed to load documents.
					</p>
				) : filtered.length === 0 ? (
					<p className="min-h-0 flex-1 p-6 text-muted-foreground text-sm">
						No documents found. Add a text source or URL to get
						started.
					</p>
				) : (
					<DataTableBody>
						<Table>
							<TableHeader>
								<DataTableHeaderRow>
									<SelectColumnHead
										allSelected={selection.allPageSelected}
										someSelected={
											selection.somePageSelected
										}
										onToggle={selection.togglePage}
									/>
									<TableHead>Title</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Updated</TableHead>
									<TableHead className="w-20">
										<span className="sr-only">Actions</span>
									</TableHead>
								</DataTableHeaderRow>
							</TableHeader>
							<TableBody>
								{pageItems.map((doc) => {
									const selected = selection.isSelected(
										doc.id,
									);
									return (
										<TableRow
											key={doc.id}
											className={dataTableRowClass(
												selected,
											)}
										>
											<TableCell className="w-10 px-3">
												<RowCheckbox
													checked={selected}
													onToggle={() =>
														selection.toggle(doc.id)
													}
													label={`Select ${doc.title}`}
												/>
											</TableCell>
											<TableCell>
												<IdentityCell
													name={doc.title}
													secondary={documentSecondary(
														doc,
													)}
													showAvatar={false}
												/>
												{doc.errorMessage ? (
													<p className="mt-0.5 text-rose-600 text-xs">
														{doc.errorMessage}
													</p>
												) : null}
											</TableCell>
											<TableCell>
												<StatusBadge
													label={doc.status}
													tone={doc.status.toLowerCase()}
												/>
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{formatDistanceToNow(
													new Date(doc.updatedAt),
													{ addSuffix: true },
												)}
											</TableCell>
											<TableCell>
												<div className="flex items-center justify-end">
													<DropdownMenu>
														<DropdownMenuTrigger
															asChild
														>
															<Button
																type="button"
																variant="ghost"
																size="icon"
																className="size-8"
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
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</DataTableBody>
				)}
			</DataTableShell>

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
