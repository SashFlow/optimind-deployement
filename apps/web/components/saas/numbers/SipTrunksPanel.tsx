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
import { cn } from "@repo/ui/utils";
import { MoreVerticalIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import {
	useCreateSipTrunkMutation,
	useDeleteSipTrunkMutation,
	useSipTrunksQuery,
} from "@/components/saas/numbers/lib/hooks";
import type {
	SipTrunk,
	TrunkDirection,
} from "@/components/saas/numbers/lib/types";
import { Pagination } from "@/components/saas/shared/Pagination";

const ITEMS_PER_PAGE = 10;

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

	const trunks = trunksQuery.data ?? [];
	const pageCount = Math.max(1, Math.ceil(trunks.length / ITEMS_PER_PAGE));

	useEffect(() => {
		if (currentPage > pageCount) setCurrentPage(pageCount);
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return trunks.slice(start, start + ITEMS_PER_PAGE);
	}, [trunks, currentPage]);

	async function handleCreate(event: React.FormEvent) {
		event.preventDefault();
		if (!name.trim()) return;
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
		if (!deleteTarget) return;
		try {
			await deleteMutation.mutateAsync(deleteTarget.id);
			toast.success(`Deleted ${deleteTarget.name}`);
			setDeleteTarget(null);
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Failed to delete trunk",
			);
		}
	}

	const busy = createMutation.isPending || deleteMutation.isPending;

	return (
		<>
			<div className="flex justify-end border-b p-5">
				<Button
					type="button"
					size="sm"
					onClick={() => setFormOpen(true)}
				>
					Create trunk
				</Button>
			</div>

			{trunksQuery.isPending ? (
				<LoadingState />
			) : trunksQuery.isError ? (
				<p className="p-6 text-sm text-destructive">
					Unable to load trunks.
				</p>
			) : trunks.length === 0 ? (
				<p className="p-6 text-sm text-muted-foreground">
					No SIP trunks yet.
				</p>
			) : (
				<>
					<div className="overflow-x-auto scrollbar-none">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>Name</TableHead>
									<TableHead>Direction</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>LiveKit</TableHead>
									<TableHead className="w-12">
										<span className="sr-only">Actions</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paged.map((trunk) => (
									<TableRow key={trunk.id}>
										<TableCell className="font-medium">
											{trunk.name}
										</TableCell>
										<TableCell className="capitalize">
											{trunk.direction}
										</TableCell>
										<TableCell>
											<span
												className={cn(
													"inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
													trunk.status === "active"
														? "bg-emerald-50 text-emerald-700"
														: "bg-amber-50 text-amber-700",
												)}
											>
												{trunk.status}
											</span>
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{trunk.livekit_trunk_id ??
												"unsynced"}
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
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
								))}
							</TableBody>
						</Table>
					</div>
					<footer className="border-t px-5 py-3">
						<Pagination
							totalItems={trunks.length}
							itemsPerPage={ITEMS_PER_PAGE}
							currentPage={currentPage}
							onChangeCurrentPage={setCurrentPage}
						/>
					</footer>
				</>
			)}

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
					if (!open) setDeleteTarget(null);
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
		</>
	);
}
