"use client";

import { Button } from "@repo/ui/button";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { MoreVerticalIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import {
	useCreateSipTrunkMutation,
	useDeleteSipTrunkMutation,
	useSipTrunksQuery,
} from "@/hooks/numbers";
import type { SipTrunk, TrunkDirection } from "@/types/numbers";

type SipTrunksPanelProps = {
	organizationId: string | null;
};

export function SipTrunksPanel({ organizationId }: SipTrunksPanelProps) {
	const trunksQuery = useSipTrunksQuery(organizationId);
	const createMutation = useCreateSipTrunkMutation(organizationId);
	const deleteMutation = useDeleteSipTrunkMutation(organizationId);

	const [formOpen, setFormOpen] = useState(false);
	const [name, setName] = useState("");
	const [direction, setDirection] = useState<TrunkDirection>("inbound");
	const [address, setAddress] = useState("");
	const [deleteTarget, setDeleteTarget] = useState<SipTrunk | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [bulkBusy, setBulkBusy] = useState(false);

	const trunks = trunksQuery.data ?? [];
	const pageCount = Math.max(1, Math.ceil(trunks.length / PAGE_SIZE));

	useEffect(() => {
		if (currentPage > pageCount) {
			setCurrentPage(pageCount);
		}
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return trunks.slice(start, start + PAGE_SIZE);
	}, [trunks, currentPage]);

	const pageIds = useMemo(() => paged.map((trunk) => trunk.id), [paged]);
	const selection = useRowSelection(pageIds);

	async function handleCreate(event: React.FormEvent) {
		event.preventDefault();
		if (!name.trim()) {
			return;
		}
		try {
			await createMutation.mutateAsync({
				name: name.trim(),
				direction,
				address: address.trim() || null,
			});
			toast.success("Trunk created");
			setFormOpen(false);
			setName("");
			setAddress("");
			setDirection("inbound");
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Failed to create trunk",
			);
		}
	}

	async function handleDelete() {
		if (!deleteTarget) {
			return;
		}
		try {
			await deleteMutation.mutateAsync(deleteTarget.id);
			toast.success(`Deleted ${deleteTarget.name}`);
			selection.clear();
			setDeleteTarget(null);
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Failed to delete trunk",
			);
		}
	}

	async function bulkDelete() {
		if (selection.selectedCount === 0) return;
		setBulkBusy(true);
		let ok = 0;
		const ids = selection.selectedIds;
		for (const id of ids) {
			try {
				await deleteMutation.mutateAsync(id);
				ok += 1;
			} catch {
				// continue
			}
		}
		setBulkBusy(false);
		selection.clear();
		toast.success(
			`Deleted ${ok} of ${ids.length} trunk${ids.length === 1 ? "" : "s"}`,
		);
	}

	const busy =
		createMutation.isPending || deleteMutation.isPending || bulkBusy;

	const toolbar = (
		<div className="ml-auto">
			<Button type="button" size="sm" onClick={() => setFormOpen(true)}>
				Create trunk
			</Button>
		</div>
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
					disabled={busy}
					className="text-destructive"
					onClick={() => {
						void bulkDelete();
					}}
				>
					Delete
				</Button>
			</DataTableBulkBar>
		) : null;

	return (
		<section className="flex min-h-0 flex-1 flex-col">
			<DataTableShell
				toolbar={selection.selectedCount > 0 ? undefined : toolbar}
				bulkBar={bulkBar}
				footer={
					!trunksQuery.isPending &&
					!trunksQuery.isError &&
					trunks.length > 0 ? (
						<Pagination
							totalItems={trunks.length}
							itemsPerPage={PAGE_SIZE}
							currentPage={currentPage}
							onChangeCurrentPage={setCurrentPage}
						/>
					) : null
				}
			>
				{trunksQuery.isPending ? (
					<DataTableBody>
						<TableBodySkeleton
							headers={[
								"",
								"Name",
								"Status",
								"LiveKit",
								"Actions",
							]}
							columns={[
								{ type: "action" },
								{ type: "lines", widths: ["w-32", "w-20"] },
								{ type: "pill" },
								{ type: "text", width: "w-24" },
								{ type: "action" },
							]}
						/>
					</DataTableBody>
				) : trunksQuery.isError ? (
					<p
						className="min-h-0 flex-1 p-6 text-sm text-destructive"
						role="alert"
					>
						Unable to load trunks.
					</p>
				) : trunks.length === 0 ? (
					<p className="min-h-0 flex-1 p-6 text-sm text-muted-foreground">
						No SIP trunks yet.
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
									<TableHead>Name</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>LiveKit</TableHead>
									<TableHead className="w-12">
										<span className="sr-only">Actions</span>
									</TableHead>
								</DataTableHeaderRow>
							</TableHeader>
							<TableBody>
								{paged.map((trunk) => {
									const selected = selection.isSelected(
										trunk.id,
									);
									return (
										<TableRow
											key={trunk.id}
											className={dataTableRowClass(
												selected,
											)}
										>
											<TableCell className="w-10 px-3">
												<RowCheckbox
													checked={selected}
													onToggle={() =>
														selection.toggle(
															trunk.id,
														)
													}
													label={`Select ${trunk.name}`}
												/>
											</TableCell>
											<TableCell>
												<IdentityCell
													name={trunk.name}
													secondary={
														trunk.direction
															.charAt(0)
															.toUpperCase() +
														trunk.direction.slice(1)
													}
												/>
											</TableCell>
											<TableCell>
												<StatusBadge
													label={trunk.status}
													tone={trunk.status}
												/>
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{trunk.livekit_trunk_id ??
													"unsynced"}
											</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger
														asChild
													>
														<Button
															variant="ghost"
															size="icon"
															className="size-8"
															disabled={busy}
															aria-label={`Actions for ${trunk.name}`}
														>
															<MoreVerticalIcon className="size-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															className="text-destructive focus:text-destructive"
															onClick={() =>
																setDeleteTarget(
																	trunk,
																)
															}
														>
															Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</DataTableBody>
				)}
			</DataTableShell>

			<Dialog open={formOpen} onOpenChange={setFormOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create SIP trunk</DialogTitle>
						<DialogDescription>
							Provisions inbound or outbound SIP via telephony
							ORPC.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleCreate} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="trunk-name">Name</Label>
							<Input
								id="trunk-name"
								value={name}
								onChange={(event) =>
									setName(event.target.value)
								}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label>Direction</Label>
							<Select
								value={direction}
								onValueChange={(value) => {
									if (
										value === "inbound" ||
										value === "outbound"
									) {
										setDirection(value);
									}
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="inbound">
										Inbound
									</SelectItem>
									<SelectItem value="outbound">
										Outbound
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="trunk-address">
								{direction === "inbound"
									? "LiveKit SIP host"
									: "Plivo outbound address"}
							</Label>
							<Input
								id="trunk-address"
								value={address}
								onChange={(event) =>
									setAddress(event.target.value)
								}
								placeholder={
									direction === "inbound"
										? "example.sip.livekit.cloud"
										: "sip:xxxxx.zt.plivo.com"
								}
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setFormOpen(false)}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={busy || !name.trim()}
							>
								{createMutation.isPending
									? "Creating…"
									: "Create"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete trunk?</DialogTitle>
						<DialogDescription>
							{deleteTarget?.name}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setDeleteTarget(null)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							disabled={busy}
							onClick={() => void handleDelete()}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
