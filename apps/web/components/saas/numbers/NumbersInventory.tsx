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
import { cn } from "@repo/ui/utils";
import { MoreVerticalIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import {
	useCreatePhoneNumberMutation,
	useDeletePhoneNumberMutation,
	usePhoneNumbersQuery,
	useReleasePlivoNumberMutation,
	useSipTrunksQuery,
	useUpdatePhoneNumberMutation,
} from "@/components/saas/numbers/lib/hooks";
import type { Agent, PhoneNumber } from "@/components/saas/numbers/lib/types";
import { Pagination } from "@/components/saas/shared/Pagination";

const ITEMS_PER_PAGE = 10;

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
		if (!query) return numbers;
		return numbers.filter(
			(number) =>
				number.e164.toLowerCase().includes(query) ||
				(number.provider_sid?.toLowerCase().includes(query) ?? false),
		);
	}, [numbersQuery.data, search]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

	useEffect(() => {
		setCurrentPage(1);
	}, [search]);

	useEffect(() => {
		if (currentPage > pageCount) setCurrentPage(pageCount);
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filtered.slice(start, start + ITEMS_PER_PAGE);
	}, [filtered, currentPage]);

	async function handleAdd(event: React.FormEvent) {
		event.preventDefault();
		if (!e164.trim()) return;
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
		if (!confirm) return;
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

	return (
		<>
			<div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
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
					onClick={() => setAddOpen(true)}
				>
					Register number
				</Button>
			</div>

			{numbersQuery.isPending ? (
				<LoadingState />
			) : numbersQuery.isError ? (
				<p className="p-6 text-sm text-destructive">
					Unable to load phone numbers.
				</p>
			) : (numbersQuery.data ?? []).length === 0 ? (
				<div className="px-6 py-10 text-center">
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
				<p className="p-6 text-sm text-muted-foreground">
					No numbers found.
				</p>
			) : (
				<>
					<div className="overflow-x-auto scrollbar-none">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>Number</TableHead>
									<TableHead>Agent</TableHead>
									<TableHead>Trunk</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-12">
										<span className="sr-only">Actions</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paged.map((number) => (
									<TableRow key={number.id}>
										<TableCell>
											<div className="min-w-0">
												<p className="font-mono font-medium">
													{number.e164}
												</p>
												<p className="text-xs text-muted-foreground">
													{number.provider_sid
														? `Plivo · ${number.provider_sid.slice(0, 12)}`
														: "Manual"}
												</p>
											</div>
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
											<span
												className={cn(
													"inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
													number.is_active
														? "bg-emerald-50 text-emerald-700"
														: "bg-rose-50 text-rose-700",
												)}
											>
												{number.is_active
													? "Active"
													: "Inactive"}
											</span>
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
					if (!open) setConfirm(null);
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
		</>
	);
}
