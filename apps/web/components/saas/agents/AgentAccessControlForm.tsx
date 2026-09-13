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
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CopyIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	DataTableBulkBar,
	IdentityCell,
	StatusBadge,
} from "@/components/saas/shared/DataTable";
import { PAGE_SIZE } from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import { DataTable } from "@/components/saas/shared/StandardDataTable";

type TrialLink = {
	id: string;
	label: string;
	token: string;
	sessions: number;
	expiresAt: string | null;
	used: number;
	enabled: boolean;
};

type TrialFormState = {
	label: string;
	sessions: string;
	expiresAt: string;
};

const EMPTY_FORM: TrialFormState = {
	label: "",
	sessions: "1",
	expiresAt: "",
};

function formatExpiry(value: string | null) {
	if (!value) return "Never";
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function absoluteShareUrl(path: string) {
	if (typeof window === "undefined") return path;
	try {
		return new URL(path, window.location.origin).toString();
	} catch {
		return path;
	}
}

function trialStatus(trial: TrialLink) {
	const remaining = Math.max(0, trial.sessions - trial.used);
	if (!trial.enabled) return { label: "Disabled", remaining };
	if (trial.expiresAt) {
		const expiresAt = new Date(`${trial.expiresAt}T00:00:00`);
		if (
			!Number.isNaN(expiresAt.getTime()) &&
			expiresAt.getTime() < Date.now()
		) {
			return { label: "Expired", remaining };
		}
	}
	if (remaining <= 0) return { label: "Exhausted", remaining };
	return { label: "Active", remaining };
}

async function copyTrialUrl(path: string) {
	try {
		await navigator.clipboard.writeText(absoluteShareUrl(path));
		toast.success("Link copied");
	} catch {
		toast.error("Could not copy link");
	}
}

export function AgentAccessControlForm({ agentId }: { agentId: string }) {
	const queryClient = useQueryClient();
	const trialLinksQuery = useQuery(
		orpc.agents.listTrialLinks.queryOptions({
			input: { id: agentId },
		}),
	);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingTrial, setEditingTrial] = useState<TrialLink | null>(null);
	const [form, setForm] = useState<TrialFormState>(EMPTY_FORM);
	const [bulkBusy, setBulkBusy] = useState(false);
	const selectedTrialsRef = useRef<TrialLink[]>([]);
	const clearSelectionRef = useRef<() => void>(() => {});
	const trials: TrialLink[] = (trialLinksQuery.data?.trials ?? []).map(
		(trial) => ({
			id: trial.id,
			label: trial.label || "Untitled",
			token: trial.token ?? "",
			sessions: trial.usageLimit,
			expiresAt: trial.expiresAt
				? new Date(trial.expiresAt).toISOString().slice(0, 10)
				: null,
			used: trial.usageCount,
			enabled: trial.enabled,
		}),
	);
	const listKey = orpc.agents.listTrialLinks.key({ input: { id: agentId } });

	const createMutation = useMutation(
		orpc.agents.createTrialLink.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: listKey });
				toast.success("Trial link created");
			},
			onError: (error) =>
				toast.error(error.message || "Failed to create link"),
		}),
	);

	const updateMutation = useMutation(
		orpc.agents.updateTrialLink.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: listKey });
				toast.success("Trial link updated");
			},
			onError: (error) =>
				toast.error(error.message || "Failed to update link"),
		}),
	);

	const deleteMutation = useMutation(
		orpc.agents.deleteTrialLink.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: listKey });
				toast.success("Trial link removed");
			},
			onError: (error) =>
				toast.error(error.message || "Failed to remove link"),
		}),
	);

	const isEditing = Boolean(editingTrial);
	const sessionsValue = Number.parseInt(form.sessions, 10);
	const canSubmit =
		form.label.trim().length > 0 &&
		Number.isFinite(sessionsValue) &&
		sessionsValue > 0;

	useEffect(() => {
		if (!dialogOpen) return;
		if (editingTrial) {
			setForm({
				label: editingTrial.label,
				sessions: String(editingTrial.sessions),
				expiresAt: editingTrial.expiresAt ?? "",
			});
			return;
		}
		setForm(EMPTY_FORM);
	}, [dialogOpen, editingTrial]);

	function openCreateDialog() {
		setEditingTrial(null);
		setForm(EMPTY_FORM);
		setDialogOpen(true);
	}

	function openEditDialog(trial: TrialLink) {
		setEditingTrial(trial);
		setDialogOpen(true);
	}

	function handleDialogOpenChange(open: boolean) {
		setDialogOpen(open);
		if (!open) {
			setEditingTrial(null);
			setForm(EMPTY_FORM);
		}
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (!canSubmit) return;

		const nextSessions = sessionsValue;
		const nextExpiry = form.expiresAt.trim();
		const nextLabel = form.label.trim();

		if (editingTrial) {
			await updateMutation.mutateAsync({
				id: agentId,
				trialId: editingTrial.id,
				label: nextLabel,
				sessions: nextSessions,
				expiresAt: nextExpiry
					? new Date(`${nextExpiry}T00:00:00.000Z`).toISOString()
					: null,
			});
		} else {
			await createMutation.mutateAsync({
				id: agentId,
				label: nextLabel,
				sessions: nextSessions,
				expiresAt: nextExpiry
					? new Date(`${nextExpiry}T00:00:00.000Z`).toISOString()
					: null,
			});
		}

		handleDialogOpenChange(false);
	}

	async function removeTrial(trialId: string) {
		await deleteMutation.mutateAsync({
			id: agentId,
			trialId,
		});
	}

	async function bulkDelete() {
		const selected = selectedTrialsRef.current;
		if (selected.length === 0) return;
		setBulkBusy(true);
		try {
			for (const trial of selected) {
				await deleteMutation.mutateAsync({
					id: agentId,
					trialId: trial.id,
				});
			}
			clearSelectionRef.current();
		} finally {
			setBulkBusy(false);
		}
	}

	async function toggleTrialEnabled(trial: TrialLink, enabled: boolean) {
		await updateMutation.mutateAsync({
			id: agentId,
			trialId: trial.id,
			enabled,
		});
	}

	const columns = useMemo<ColumnDef<TrialLink>[]>(
		() => [
			{
				accessorKey: "label",
				header: "Label",
				cell: ({ row }) => (
					<IdentityCell
						name={row.original.label}
						showAvatar={false}
					/>
				),
			},
			{
				id: "url",
				header: "URL",
				cell: ({ row }) => {
					const trial = row.original;
					const sharePath = `/share/${trial.token}`;
					const shareUrl = absoluteShareUrl(sharePath);
					return (
						<div className="flex min-w-0 max-w-[16rem] items-center gap-1">
							<span
								className="truncate font-mono text-xs text-muted-foreground"
								title={shareUrl}
							>
								{shareUrl}
							</span>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label={`Copy ${trial.label} link`}
								className="size-7 shrink-0 text-muted-foreground"
								onClick={() => void copyTrialUrl(sharePath)}
							>
								<CopyIcon className="size-3.5" />
							</Button>
						</div>
					);
				},
			},
			{
				id: "status",
				header: "Status",
				cell: ({ row }) => {
					const status = trialStatus(row.original);
					return (
						<StatusBadge
							label={status.label}
							tone={status.label.toLowerCase()}
						/>
					);
				},
			},
			{
				id: "remaining",
				header: "Remaining",
				cell: ({ row }) => {
					const status = trialStatus(row.original);
					return (
						<span className="tabular-nums">
							{status.remaining}/{row.original.sessions}
						</span>
					);
				},
			},
			{
				id: "expiry",
				header: "Expiry",
				cell: ({ row }) => formatExpiry(row.original.expiresAt),
			},
			{
				id: "enabled",
				header: "Enabled",
				cell: ({ row }) => {
					const trial = row.original;
					return (
						<Switch
							checked={trial.enabled}
							aria-label={`Toggle ${trial.label}`}
							disabled={updateMutation.isPending}
							onCheckedChange={(enabled) =>
								void toggleTrialEnabled(trial, enabled)
							}
						/>
					);
				},
			},
			{
				id: "actions",
				header: () => <span className="sr-only">Actions</span>,
				size: 96,
				cell: ({ row }) => {
					const trial = row.original;
					return (
						<div className="flex justify-end gap-1">
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label={`Edit ${trial.label}`}
								className="size-8 text-muted-foreground"
								onClick={() => openEditDialog(trial)}
							>
								<PencilIcon className="size-4" />
							</Button>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label={`Remove ${trial.label}`}
								className="size-8 text-muted-foreground hover:text-destructive"
								onClick={() => void removeTrial(trial.id)}
							>
								<Trash2Icon className="size-4" />
							</Button>
						</div>
					);
				},
			},
		],
		[updateMutation.isPending],
	);

	const toolbar = (
		<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="space-y-1">
				<h2 className="font-semibold text-lg">Trial links</h2>
				<p className="text-sm text-muted-foreground">
					Shareable demo links. Guests can fully test the published
					agent on web or mobile.
				</p>
			</div>
			<Button
				type="button"
				className="shrink-0"
				onClick={openCreateDialog}
			>
				Create link
			</Button>
		</div>
	);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{trialLinksQuery.isLoading ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex min-h-16 shrink-0 items-center border-b border-border/60 px-1 py-3 sm:px-0">
						{toolbar}
					</div>
					<div className="min-h-0 flex-1 overflow-x-auto">
						<TableBodySkeleton
							headers={[
								"",
								"Label",
								"URL",
								"Status",
								"Remaining",
								"Expiry",
								"Enabled",
								"Actions",
							]}
							columns={[
								{ type: "action" },
								{ type: "text", width: "w-24" },
								{ type: "text", width: "w-40" },
								{ type: "pill" },
								{ type: "text", width: "w-14" },
								{ type: "text", width: "w-20" },
								{ type: "action" },
								{ type: "action" },
							]}
						/>
					</div>
				</div>
			) : (
				<DataTable
					columns={columns}
					data={trials}
					toolbar={toolbar}
					framed={false}
					enableRowSelection
					pageSize={PAGE_SIZE}
					getRowId={(row) => row.id}
					emptyMessage="No trial links yet."
					onSelectionChange={({ selectedRows, clearSelection }) => {
						selectedTrialsRef.current = selectedRows;
						clearSelectionRef.current = clearSelection;
					}}
					bulkBar={({ selectedCount, clearSelection }) => (
						<DataTableBulkBar
							count={selectedCount}
							onClear={clearSelection}
						>
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={bulkBusy || deleteMutation.isPending}
								className="text-destructive"
								onClick={() => {
									void bulkDelete();
								}}
							>
								{bulkBusy ? "Deleting…" : "Delete"}
							</Button>
						</DataTableBulkBar>
					)}
				/>
			)}

			<Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
				<DialogContent className="max-w-md">
					<form onSubmit={handleSubmit}>
						<DialogHeader>
							<DialogTitle>
								{isEditing
									? "Edit trial link"
									: "Create trial link"}
							</DialogTitle>
							<DialogDescription>
								{isEditing
									? "Update sessions or expiry for this demo link."
									: "Set a label, session limit, and optional expiry."}
							</DialogDescription>
						</DialogHeader>

						<div className="mt-4 space-y-4">
							<div className="space-y-2">
								<Label htmlFor="trial-label">Label</Label>
								<Input
									id="trial-label"
									value={form.label}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											label: event.target.value,
										}))
									}
									placeholder="Sales demo"
									autoFocus
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="trial-sessions">Sessions</Label>
								<Input
									id="trial-sessions"
									type="number"
									min={1}
									step={1}
									value={form.sessions}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											sessions: event.target.value,
										}))
									}
									placeholder="1"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="trial-expiry">
									Expiry date{" "}
									<span className="font-normal text-muted-foreground">
										(optional)
									</span>
								</Label>
								<Input
									id="trial-expiry"
									type="date"
									value={form.expiresAt}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											expiresAt: event.target.value,
										}))
									}
								/>
							</div>
						</div>

						<DialogFooter className="mt-6">
							<Button
								type="button"
								variant="outline"
								disabled={
									createMutation.isPending ||
									updateMutation.isPending
								}
								onClick={() => handleDialogOpenChange(false)}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								loading={
									createMutation.isPending ||
									updateMutation.isPending
								}
								disabled={
									!canSubmit ||
									createMutation.isPending ||
									updateMutation.isPending
								}
							>
								{isEditing ? "Save changes" : "Create link"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
