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
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import {
	useCreateDispatchRuleMutation,
	useDeleteDispatchRuleMutation,
	useDispatchRulesQuery,
	useSipTrunksQuery,
} from "@/components/saas/numbers/lib/hooks";
import type { Agent, DispatchRule } from "@/components/saas/numbers/lib/types";
import { Pagination } from "@/components/saas/shared/Pagination";

const ITEMS_PER_PAGE = 10;

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

	const inboundTrunks = (trunksQuery.data ?? []).filter(
		(trunk) => trunk.direction === "inbound",
	);

	const rules = rulesQuery.data ?? [];
	const pageCount = Math.max(1, Math.ceil(rules.length / ITEMS_PER_PAGE));

	useEffect(() => {
		if (currentPage > pageCount) setCurrentPage(pageCount);
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return rules.slice(start, start + ITEMS_PER_PAGE);
	}, [rules, currentPage]);

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
		if (!deleteTarget) return;
		try {
			await deleteMutation.mutateAsync(deleteTarget.id);
			toast.success("Rule deleted");
			setDeleteTarget(null);
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Failed to delete rule",
			);
		}
	}

	const busy = createMutation.isPending || deleteMutation.isPending;
	const canCreate = inboundTrunks.length > 0 && agents.length > 0;

	return (
		<>
			<div className="flex items-center justify-between gap-3 border-b p-5">
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
					disabled={!canCreate}
					onClick={openCreate}
				>
					Create rule
				</Button>
			</div>

			{rulesQuery.isPending ? (
				<LoadingState />
			) : rulesQuery.isError ? (
				<p className="p-6 text-sm text-destructive">
					Unable to load rules.
				</p>
			) : rules.length === 0 ? (
				<p className="p-6 text-sm text-muted-foreground">
					No routing rules yet.
				</p>
			) : (
				<>
					<div className="overflow-x-auto scrollbar-none">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>Name</TableHead>
									<TableHead>Trunk</TableHead>
									<TableHead>Agent</TableHead>
									<TableHead>Prefix</TableHead>
									<TableHead className="w-12">
										<span className="sr-only">Actions</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paged.map((rule) => (
									<TableRow key={rule.id}>
										<TableCell className="font-medium">
											{rule.name}
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
													rule.agent_id.slice(0, 8))
												: "—"}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{rule.room_prefix ?? "—"}
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
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
								))}
							</TableBody>
						</Table>
					</div>
					<footer className="border-t px-5 py-3">
						<Pagination
							totalItems={rules.length}
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
					if (!open) setDeleteTarget(null);
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
		</>
	);
}
