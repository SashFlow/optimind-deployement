"use client";

import { authClient } from "@repo/auth/client";
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
import { clearCache } from "@shared/lib/cache";
import { orpcClient } from "@shared/lib/orpc-client";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreVerticalIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfirmationAlert } from "@/components/saas/shared/ConfirmationAlertProvider";
import { DataTableBulkBar } from "@/components/saas/shared/DataTable";
import { PAGE_SIZE } from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import { DataTable } from "@/components/saas/shared/StandardDataTable";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { useSettingsPageAction } from "@/context/AdminSettingsActionsProvider";
import { useCreateOrganizationMutation } from "@/services/organization";
import {
	type AdminOrganization,
	mapOrgToAdminOrganization,
	TYPE_FILTER_ITEMS,
	type TypeFilter,
} from "@/types/admin";

export function AdminOrganizations() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();
	const { activeOrganization, setActiveOrganization } =
		useActiveOrganization();
	const createOrganizationMutation = useCreateOrganizationMutation();
	const organizationsQuery = useQuery({
		...orpc.admin.organizations.list.queryOptions({
			input: {
				limit: 100,
				offset: 0,
			},
		}),
		select: (data): AdminOrganization[] => {
			const payload = data as {
				organizations?: Parameters<
					typeof mapOrgToAdminOrganization
				>[0][];
			} | null;
			return (payload?.organizations ?? []).map(
				mapOrgToAdminOrganization,
			);
		},
	});

	const [createOpen, setCreateOpen] = useState(false);
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
	const selectedOrgsRef = useRef<AdminOrganization[]>([]);
	const clearSelectionRef = useRef<() => void>(() => {});

	useSettingsPageAction(() => {
		setError(null);
		setName("");
		setCreateOpen(true);
	}, "Create");

	const filtered = useMemo((): AdminOrganization[] => {
		const orgs = (organizationsQuery.data ?? []) as AdminOrganization[];
		const query = search.trim().toLowerCase();
		return orgs.filter((organization) => {
			if (typeFilter === "trial" && !organization.trial) {
				return false;
			}
			if (typeFilter === "workspace" && organization.trial) {
				return false;
			}
			if (!query) {
				return true;
			}
			return (
				organization.name.toLowerCase().includes(query) ||
				organization.id.toLowerCase().includes(query)
			);
		});
	}, [organizationsQuery.data, search, typeFilter]);

	const handleCreateOpenChange = (open: boolean) => {
		setCreateOpen(open);
		if (!open) {
			setName("");
			setError(null);
		}
	};

	const createOrganization = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();
		if (!name.trim()) return;
		setBusy(true);
		setError(null);
		try {
			await createOrganizationMutation.mutateAsync({
				name: name.trim(),
			});
			setName("");
			setCreateOpen(false);
			await queryClient.invalidateQueries({
				queryKey: orpc.admin.organizations.list.key(),
			});
			toast.success("Organization created");
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Unable to create organization.",
			);
		} finally {
			setBusy(false);
		}
	};

	const deleteOrganization = (id: string, organizationName: string) => {
		confirm({
			title: "Delete organization",
			message: `Delete ${organizationName}?`,
			confirmLabel: "Delete",
			destructive: true,
			onConfirm: async () => {
				setBusy(true);
				setError(null);
				try {
					const { error: deleteError } =
						await authClient.organization.delete({
							organizationId: id,
						});
					if (deleteError) {
						throw new Error(
							deleteError.message ||
								"Unable to delete organization.",
						);
					}
					await queryClient.invalidateQueries({
						queryKey: orpc.admin.organizations.list.key(),
					});
					clearSelectionRef.current();
					toast.success("Organization deleted");
				} catch (cause) {
					setError(
						cause instanceof Error
							? cause.message
							: "Unable to delete organization.",
					);
				} finally {
					setBusy(false);
				}
			},
		});
	};

	const switchOrganization = async (organization: {
		id: string;
		name: string;
		slug: string | null;
	}) => {
		if (!organization.slug) {
			toast.error("This organization has no slug to switch to.");
			return;
		}
		if (activeOrganization?.id === organization.id) {
			toast.message(`${organization.name} is already active`);
			return;
		}
		setBusy(true);
		setError(null);
		try {
			await clearCache();
			await setActiveOrganization(organization.slug);
			toast.success(`Switched to ${organization.name}`);
		} catch (cause) {
			const message =
				cause instanceof Error
					? cause.message
					: "Unable to switch organization.";
			setError(message);
			toast.error(message);
		} finally {
			setBusy(false);
		}
	};

	const fillDemoData = (organization: { id: string; name: string }) => {
		confirm({
			title: "Fill demo data",
			message: `Fill demo dashboard data for ${organization.name}? This replaces any previous demo fill for that organization.`,
			confirmLabel: "Fill demo data",
			onConfirm: async () => {
				setBusy(true);
				setError(null);
				try {
					const result =
						await orpcClient.admin.organizations.fillDemoData({
							organizationId: organization.id,
						});
					toast.success(
						`Seeded ${result.sessionsCreated} demo sessions for ${organization.name}`,
					);
				} catch (cause) {
					const message =
						cause instanceof Error
							? cause.message
							: "Unable to fill demo data.";
					setError(message);
					toast.error(message);
				} finally {
					setBusy(false);
				}
			},
		});
	};

	const bulkDelete = () => {
		const targets = selectedOrgsRef.current;
		if (targets.length === 0) return;
		confirm({
			title: "Delete organizations",
			message: `Delete ${targets.length} organization${targets.length === 1 ? "" : "s"}?`,
			confirmLabel: "Delete",
			destructive: true,
			onConfirm: async () => {
				setBusy(true);
				setError(null);
				let deleted = 0;
				try {
					for (const organization of targets) {
						const { error: deleteError } =
							await authClient.organization.delete({
								organizationId: organization.id,
							});
						if (!deleteError) deleted += 1;
					}
					await queryClient.invalidateQueries({
						queryKey: orpc.admin.organizations.list.key(),
					});
					clearSelectionRef.current();
					if (deleted === 0) {
						setError("Unable to delete organizations.");
						return;
					}
					toast.success(
						`Deleted ${deleted} organization${deleted === 1 ? "" : "s"}`,
					);
				} catch (cause) {
					setError(
						cause instanceof Error
							? cause.message
							: "Unable to delete organizations.",
					);
				} finally {
					setBusy(false);
				}
			},
		});
	};

	const filters = (
		<div className="ml-auto flex w-full min-w-0 items-center gap-2 sm:w-auto">
			<div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
				<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search by name or id..."
					className="h-9 pl-9"
				/>
			</div>
			<Select
				value={typeFilter}
				onValueChange={(value) => {
					if (value) setTypeFilter(value as TypeFilter);
				}}
			>
				<SelectTrigger className="h-9 w-[9.5rem] shrink-0">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{TYPE_FILTER_ITEMS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);

	const columns = useMemo<ColumnDef<AdminOrganization>[]>(
		() => [
			{
				id: "name",
				header: "Name",
				cell: ({ row }) => row.original.name,
			},
			{
				id: "created",
				header: "Created",
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.created_at
							? new Date(
									row.original.created_at,
								).toLocaleDateString()
							: "—"}
					</span>
				),
			},
			{
				id: "actions",
				header: () => <span className="sr-only">Actions</span>,
				size: 48,
				cell: ({ row }) => {
					const organization = row.original;
					return (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="size-8"
									disabled={busy}
									aria-label={`Actions for ${organization.name}`}
								>
									<MoreVerticalIcon className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									disabled={
										!organization.slug ||
										activeOrganization?.id ===
											organization.id
									}
									onClick={() => {
										void switchOrganization(organization);
									}}
								>
									Switch
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => {
										void fillDemoData(organization);
									}}
								>
									Demo Data
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => {
										router.push(
											`/app/settings/organizations/${organization.id}`,
										);
									}}
								>
									Edit
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									onClick={() => {
										void deleteOrganization(
											organization.id,
											organization.name,
										);
									}}
								>
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
			},
		],
		[activeOrganization?.id, busy, router],
	);

	return (
		<section className="flex min-h-0 flex-1 flex-col">
			{error && !createOpen ? (
				<p className="shrink-0 text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}

			{organizationsQuery.isPending ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex h-16 shrink-0 items-center border-b border-border/60 px-1 sm:px-0">
						{filters}
					</div>
					<div className="min-h-0 flex-1 overflow-x-auto">
						<TableBodySkeleton
							headers={["", "Name", "Created", "Actions"]}
							columns={[
								{ type: "action" },
								{ type: "lines", widths: ["w-40", "w-20"] },
								{ type: "text", width: "w-24" },
								{ type: "action" },
							]}
						/>
					</div>
				</div>
			) : organizationsQuery.isError ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex h-16 shrink-0 items-center border-b border-border/60 px-1 sm:px-0">
						{filters}
					</div>
					<p className="py-6 text-sm text-destructive" role="alert">
						Unable to load organizations.
					</p>
				</div>
			) : (
				<DataTable
					key={`${search}-${typeFilter}`}
					columns={columns}
					data={filtered}
					toolbar={filters}
					framed={false}
					enableRowSelection
					pageSize={PAGE_SIZE}
					getRowId={(row) => row.id}
					emptyMessage="No organizations found."
					onSelectionChange={({ selectedRows, clearSelection }) => {
						selectedOrgsRef.current = selectedRows;
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
								disabled={busy}
								className="text-destructive"
								onClick={() => {
									void bulkDelete();
								}}
							>
								Delete selected
							</Button>
						</DataTableBulkBar>
					)}
				/>
			)}

			<Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create organization</DialogTitle>
						<DialogDescription>
							Add a new workspace for a customer or team.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={createOrganization} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="organization-name">Name</Label>
							<Input
								id="organization-name"
								required
								value={name}
								onChange={(event) =>
									setName(event.target.value)
								}
								placeholder="Acme Inc."
								disabled={busy}
							/>
						</div>
						{error ? (
							<p
								className="text-sm text-destructive"
								role="alert"
							>
								{error}
							</p>
						) : null}
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleCreateOpenChange(false)}
								disabled={busy}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={busy || !name.trim()}
							>
								{busy ? "Creating…" : "Create"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</section>
	);
}
