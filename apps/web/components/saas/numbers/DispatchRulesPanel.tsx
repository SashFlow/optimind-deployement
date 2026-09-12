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
	dataTableRowClass,
} from "@/components/saas/shared/DataTable";
import { PAGE_SIZE, Pagination } from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import { useRowSelection } from "@/components/saas/shared/useRowSelection";
import {
	useCreateDispatchRuleMutation,
	useDeleteDispatchRuleMutation,
	useDispatchRulesQuery,
	useSipTrunksQuery,
} from "@/hooks/numbers";
import type { Agent, DispatchRule } from "@/types/numbers";

type DispatchRulesPanelProps = {
	organizationId: string | null;
	agents: Agent[];
	onCreateTrunk: () => void;
};

export function DispatchRulesPanel({
	organizationId,
	agents,
	onCreateTrunk,
}: DispatchRulesPanelProps) {
	const rulesQuery = useDispatchRulesQuery(organizationId);
	const trunksQuery = useSipTrunksQuery(organizationId);
	const createMutation = useCreateDispatchRuleMutation(organizationId);
	const deleteMutation = useDeleteDispatchRuleMutation(organizationId);

	const [formOpen, setFormOpen] = useState(false);
	const [sipTrunkId, setSipTrunkId] = useState("");
	const [agentId, setAgentId] = useState("");
	const [roomPrefix, setRoomPrefix] = useState("");
	const [deleteTarget, setDeleteTarget] = useState<DispatchRule | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [bulkBusy, setBulkBusy] = useState(false);

	const inboundTrunks = (trunksQuery.data ?? []).filter(
		(trunk) => trunk.direction === "inbound",
	);

	const rules = rulesQuery.data ?? [];
	const pageCount = Math.max(1, Math.ceil(rules.length / PAGE_SIZE));

	useEffect(() => {
		if (currentPage > pageCount) {
			setCurrentPage(pageCount);
		}
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return rules.slice(start, start + PAGE_SIZE);
	}, [rules, currentPage]);

	const pageIds = useMemo(() => paged.map((rule) => rule.id), [paged]);
	const selection = useRowSelection(pageIds);

	const trunkNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const trunk of trunksQuery.data ?? []) {
			map.set(trunk.id, trunk.name);
		}
		return map;
	}, [trunksQuery.data]);

	const agentNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const agent of agents) {
			map.set(agent.id, agent.name);
		}
		return map;
	}, [agents]);

	function openCreate() {
		setSipTrunkId(inboundTrunks[0]?.id ?? "");
		setAgentId(agents[0]?.id ?? "");
		setRoomPrefix("");
		setFormOpen(true);
	}

	async function handleCreate(event: React.FormEvent) {
		event.preventDefault();
		if (!agentId || !sipTrunkId) {
			toast.error("Select a trunk and agent");
			return;
		}
		try {
			await createMutation.mutateAsync({
				sip_trunk_id: sipTrunkId,
				agent_id: agentId,
				room_prefix: roomPrefix.trim() || null,
			});
			toast.success("Routing rule created");
			setFormOpen(false);
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Failed to create rule",
			);
		}
	}

	async function handleDelete() {
		if (!deleteTarget) {
			return;
		}
		try {
			await deleteMutation.mutateAsync(deleteTarget.id);
			toast.success("Rule deleted");
			selection.clear();
			setDeleteTarget(null);
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Failed to delete rule",
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
			`Deleted ${ok} of ${ids.length} rule${ids.length === 1 ? "" : "s"}`,
		);
	}

	const busy =
		createMutation.isPending || deleteMutation.isPending || bulkBusy;
	const canCreate = inboundTrunks.length > 0 && agents.length > 0;

	const toolbar = (
		<>
			{inboundTrunks.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Create an inbound trunk before adding routing.{" "}
					<button
						type="button"
						className="underline"
						onClick={onCreateTrunk}
					>
						Create trunk
					</button>
				</p>
			) : (
				<span />
			)}
			<Button
				type="button"
				size="sm"
				className="ml-auto"
				disabled={!canCreate}
				onClick={openCreate}
			>
				Create rule
			</Button>
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
					!rulesQuery.isPending &&
					!rulesQuery.isError &&
					rules.length > 0 ? (
						<Pagination
							totalItems={rules.length}
							itemsPerPage={PAGE_SIZE}
							currentPage={currentPage}
							onChangeCurrentPage={setCurrentPage}
						/>
					) : null
				}
			>
				{rulesQuery.isPending ? (
					<DataTableBody>
						<TableBodySkeleton
							headers={["", "Name", "Trunk", "Agent", "Actions"]}
							columns={[
								{ type: "action" },
								{ type: "lines", widths: ["w-32", "w-16"] },
								{ type: "text", width: "w-28" },
								{ type: "text", width: "w-28" },
								{ type: "action" },
							]}
						/>
					</DataTableBody>
				) : rulesQuery.isError ? (
					<p
						className="min-h-0 flex-1 p-6 text-sm text-destructive"
						role="alert"
					>
						Unable to load rules.
					</p>
				) : rules.length === 0 ? (
					<p className="min-h-0 flex-1 p-6 text-sm text-muted-foreground">
						No routing rules yet.
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
									<TableHead>Trunk</TableHead>
									<TableHead>Agent</TableHead>
									<TableHead className="w-12">
										<span className="sr-only">Actions</span>
									</TableHead>
								</DataTableHeaderRow>
							</TableHeader>
							<TableBody>
								{paged.map((rule) => {
									const selected = selection.isSelected(
										rule.id,
									);
									return (
										<TableRow
											key={rule.id}
											className={dataTableRowClass(
												selected,
											)}
										>
											<TableCell className="w-10 px-3">
												<RowCheckbox
													checked={selected}
													onToggle={() =>
														selection.toggle(
															rule.id,
														)
													}
													label={`Select ${rule.name}`}
												/>
											</TableCell>
											<TableCell>
												<IdentityCell
													name={rule.name}
													secondary={
														rule.room_prefix ??
														undefined
													}
												/>
											</TableCell>
											<TableCell className="text-muted-foreground">
												{rule.sip_trunk_id
													? (trunkNameById.get(
															rule.sip_trunk_id,
														) ??
														rule.sip_trunk_id.slice(
															0,
															8,
														))
													: "—"}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{rule.agent_id
													? (agentNameById.get(
															rule.agent_id,
														) ??
														rule.agent_id.slice(
															0,
															8,
														))
													: "—"}
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
															aria-label={`Actions for ${rule.name}`}
														>
															<MoreVerticalIcon className="size-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															className="text-destructive focus:text-destructive"
															onClick={() =>
																setDeleteTarget(
																	rule,
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
						<DialogTitle>Create routing rule</DialogTitle>
						<DialogDescription>
							Routes inbound SIP calls to an agent.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleCreate} className="space-y-4">
						<div className="space-y-2">
							<Label>SIP trunk</Label>
							<Select
								value={sipTrunkId}
								onValueChange={setSipTrunkId}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select trunk" />
								</SelectTrigger>
								<SelectContent>
									{inboundTrunks.map((trunk) => (
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
						<div className="space-y-2">
							<Label>Agent</Label>
							<Select value={agentId} onValueChange={setAgentId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select agent" />
								</SelectTrigger>
								<SelectContent>
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
							<Label htmlFor="room-prefix">
								Room prefix (optional)
							</Label>
							<Input
								id="room-prefix"
								value={roomPrefix}
								onChange={(event) =>
									setRoomPrefix(event.target.value)
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
							<Button type="submit" disabled={busy}>
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
						<DialogTitle>Delete rule?</DialogTitle>
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
