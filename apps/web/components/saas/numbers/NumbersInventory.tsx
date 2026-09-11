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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { MoreVerticalIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	DataTableBody,
	DataTableHeaderRow,
	DataTableShell,
	IdentityCell,
	StatusBadge,
	dataTableRowClass,
} from "@/components/saas/shared/DataTable";
import { PAGE_SIZE, Pagination } from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import {
	useCreatePhoneNumberMutation,
	useDeletePhoneNumberMutation,
	usePhoneNumbersQuery,
	useReleasePlivoNumberMutation,
	useSipTrunksQuery,
	useUpdatePhoneNumberMutation,
} from "@/hooks/numbers";
import type { Agent, PhoneNumber } from "@/types/numbers";

type NumbersInventoryProps = {
	organizationId: string | null;
	agents: Agent[];
	onGetNumber: () => void;
	onManageRouting: () => void;
};

export function NumbersInventory({
	organizationId,
	agents,
	onGetNumber,
}: NumbersInventoryProps) {
	const numbersQuery = usePhoneNumbersQuery(organizationId);
	const trunksQuery = useSipTrunksQuery(organizationId);
	const updateMutation = useUpdatePhoneNumberMutation(organizationId);
	const createMutation = useCreatePhoneNumberMutation(organizationId);
	const deleteMutation = useDeletePhoneNumberMutation(organizationId);
	const releaseMutation = useReleasePlivoNumberMutation(organizationId);

	const [addOpen, setAddOpen] = useState(false);
	const [e164, setE164] = useState("");
	const [addAgentId, setAddAgentId] = useState("");
	const [addTrunkId, setAddTrunkId] = useState("");
	const [search, setSearch] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [confirm, setConfirm] = useState<{
		type: "release" | "remove";
		number: PhoneNumber;
	} | null>(null);

	const trunkNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const trunk of trunksQuery.data ?? []) {
			map.set(trunk.id, trunk.name);
		}
		return map;
	}, [trunksQuery.data]);

	const filtered = useMemo(() => {
		const numbers = numbersQuery.data ?? [];
		const query = search.trim().toLowerCase();
		if (!query) {
			return numbers;
		}
		return numbers.filter(
			(number) =>
				number.e164.toLowerCase().includes(query) ||
				(number.provider_sid?.toLowerCase().includes(query) ?? false),
		);
	}, [numbersQuery.data, search]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

	useEffect(() => {
		setCurrentPage(1);
	}, [search]);

	useEffect(() => {
		if (currentPage > pageCount) {
			setCurrentPage(pageCount);
		}
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filtered.slice(start, start + PAGE_SIZE);
	}, [filtered, currentPage]);

	async function handleAdd(event: React.FormEvent) {
		event.preventDefault();
		if (!e164.trim()) {
			return;
		}
		try {
			await createMutation.mutateAsync({
				e164: e164.trim(),
				assigned_agent_id: addAgentId || null,
				sip_trunk_id: addTrunkId || null,
			});
			toast.success("Number synced");
			setAddOpen(false);
			setE164("");
			setAddAgentId("");
			setAddTrunkId("");
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Failed to register number",
			);
		}
	}

	async function handleConfirm() {
		if (!confirm) {
			return;
		}
		try {
			if (confirm.type === "release") {
				await releaseMutation.mutateAsync(confirm.number.id);
			} else {
				await deleteMutation.mutateAsync(confirm.number.id);
			}
			setConfirm(null);
		} catch (cause) {
			toast.error(
				cause instanceof Error ? cause.message : "Action failed",
			);
		}
	}

	const busy =
		updateMutation.isPending ||
		releaseMutation.isPending ||
		deleteMutation.isPending;

	const toolbar = (
		<>
			<div className="relative min-w-0 sm:w-72">
				<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search numbers..."
					className="pl-9"
				/>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="ml-auto"
				onClick={() => setAddOpen(true)}
			>
				Register number
			</Button>
		</>
	);

	return (
		<section className="flex min-h-0 flex-1 flex-col">
			<DataTableShell
				toolbar={toolbar}
				footer={
					!numbersQuery.isPending &&
					!numbersQuery.isError &&
					(numbersQuery.data ?? []).length > 0 &&
					filtered.length > 0 ? (
						<Pagination
							totalItems={filtered.length}
							itemsPerPage={PAGE_SIZE}
							currentPage={currentPage}
							onChangeCurrentPage={setCurrentPage}
						/>
					) : null
				}
			>
				{numbersQuery.isPending ? (
					<DataTableBody>
						<TableBodySkeleton
							headers={[
								"Number",
								"Agent",
								"Trunk",
								"Status",
								"Actions",
							]}
							columns={[
								{ type: "lines", widths: ["w-36", "w-28"] },
								{ type: "text", width: "w-28" },
								{ type: "text", width: "w-24" },
								{ type: "pill" },
								{ type: "action" },
							]}
						/>
					</DataTableBody>
				) : numbersQuery.isError ? (
					<p
						className="min-h-0 flex-1 p-6 text-sm text-destructive"
						role="alert"
					>
						Unable to load phone numbers.
					</p>
				) : (numbersQuery.data ?? []).length === 0 ? (
					<div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
						<p className="font-medium">No numbers yet</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Buy a Plivo number or register one you already own.
						</p>
						<div className="mt-4 flex flex-wrap justify-center gap-2">
							<Button type="button" onClick={onGetNumber}>
								Get a number
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => setAddOpen(true)}
							>
								Register existing
							</Button>
						</div>
					</div>
				) : filtered.length === 0 ? (
					<p className="min-h-0 flex-1 p-6 text-sm text-muted-foreground">
						No numbers found.
					</p>
				) : (
					<DataTableBody>
						<Table>
							<TableHeader>
								<DataTableHeaderRow>
									<TableHead>Number</TableHead>
									<TableHead>Agent</TableHead>
									<TableHead>Trunk</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-12">
										<span className="sr-only">Actions</span>
									</TableHead>
								</DataTableHeaderRow>
							</TableHeader>
							<TableBody>
								{paged.map((number) => (
									<TableRow
										key={number.id}
										className={dataTableRowClass()}
									>
										<TableCell>
											<IdentityCell
												name={number.e164}
												secondary={
													number.provider_sid
														? `Plivo · ${number.provider_sid.slice(0, 12)}`
														: "Manual"
												}
												showAvatar={false}
											/>
										</TableCell>
										<TableCell>
											<Select
												value={
													number.assigned_agent_id ??
													"none"
												}
												disabled={busy}
												onValueChange={(value) => {
													void updateMutation
														.mutateAsync({
															numberId: number.id,
															data: {
																assigned_agent_id:
																	value ===
																	"none"
																		? null
																		: value,
															},
														})
														.then(() =>
															toast.success(
																"Agent updated",
															),
														)
														.catch((cause) =>
															toast.error(
																cause instanceof
																	Error
																	? cause.message
																	: "Failed to update agent",
															),
														);
												}}
											>
												<SelectTrigger className="h-8 min-w-36">
													<SelectValue placeholder="Unassigned" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">
														Unassigned
													</SelectItem>
													{agents.map((agent) => (
														<SelectItem
															key={agent.id}
															value={agent.id}
														>
															{agent.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{number.sip_trunk_id
												? (trunkNameById.get(
														number.sip_trunk_id,
													) ??
													number.sip_trunk_id.slice(
														0,
														8,
													))
												: "—"}
										</TableCell>
										<TableCell>
											<StatusBadge
												label={
													number.is_active
														? "Active"
														: "Inactive"
												}
												tone={
													number.is_active
														? "active"
														: "inactive"
												}
											/>
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="size-8"
														disabled={busy}
														aria-label={`Actions for ${number.e164}`}
													>
														<MoreVerticalIcon className="size-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() =>
															setConfirm({
																type: "release",
																number,
															})
														}
													>
														Release
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														className="text-destructive focus:text-destructive"
														onClick={() =>
															setConfirm({
																type: "remove",
																number,
															})
														}
													>
														Remove
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</DataTableBody>
				)}
			</DataTableShell>

			<Dialog open={addOpen} onOpenChange={setAddOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Register number</DialogTitle>
						<DialogDescription>
							Syncs Plivo inventory for this organization.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleAdd} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="e164">E.164 number</Label>
							<Input
								id="e164"
								value={e164}
								onChange={(event) =>
									setE164(event.target.value)
								}
								placeholder="+14155550100"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label>Agent (optional)</Label>
							<Select
								value={addAgentId || "none"}
								onValueChange={(value) =>
									setAddAgentId(value === "none" ? "" : value)
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Unassigned" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">
										Unassigned
									</SelectItem>
									{agents.map((agent) => (
										<SelectItem
											key={agent.id}
											value={agent.id}
										>
											{agent.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>SIP trunk (optional)</Label>
							<Select
								value={addTrunkId || "none"}
								onValueChange={(value) =>
									setAddTrunkId(value === "none" ? "" : value)
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="None" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									{(trunksQuery.data ?? []).map((trunk) => (
										<SelectItem
											key={trunk.id}
											value={trunk.id}
										>
											{trunk.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setAddOpen(false)}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={createMutation.isPending}
							>
								{createMutation.isPending
									? "Saving…"
									: "Register"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={confirm !== null}
				onOpenChange={(open) => {
					if (!open) {
						setConfirm(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{confirm?.type === "release"
								? "Release number?"
								: "Remove number?"}
						</DialogTitle>
						<DialogDescription>
							{confirm?.number.e164}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setConfirm(null)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							disabled={busy}
							onClick={() => void handleConfirm()}
						>
							Confirm
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
