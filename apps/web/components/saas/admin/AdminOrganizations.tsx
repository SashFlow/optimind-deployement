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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { clearCache } from "@shared/lib/cache";
import { orpcClient } from "@shared/lib/orpc-client";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVerticalIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfirmationAlert } from "@/components/saas/shared/ConfirmationAlertProvider";
import {
	DataTableBody,
	DataTableBulkBar,
	DataTableHeaderRow,
	DataTableShell,
	dataTableRowClass,
	RowCheckbox,
	SelectColumnHead,
} from "@/components/saas/shared/DataTable";
import { PAGE_SIZE, Pagination } from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import { useRowSelection } from "@/components/saas/shared/useRowSelection";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { useSettingsPageAction } from "@/context/AdminSettingsActionsProvider";
import { useCreateOrganizationMutation } from "@/services/organization";
import {
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
		select: (data) =>
			(data?.organizations ?? []).map(mapOrgToAdminOrganization),
	});

	const [createOpen, setCreateOpen] = useState(false);
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
	const [currentPage, setCurrentPage] = useState(1);

	useSettingsPageAction(() => {
		setError(null);
		setName("");
		setCreateOpen(true);
	}, "Create");

	const filtered = useMemo(() => {
		const orgs = organizationsQuery.data ?? [];
		const query = search.trim().toLowerCase();
		return orgs.filter((organization) => {
			if (typeFilter === "trial" && !organization.trial) return false;
			if (typeFilter === "workspace" && organization.trial) return false;
			if (!query) return true;
			return (
				organization.name.toLowerCase().includes(query) ||
				organization.id.toLowerCase().includes(query)
			);
		});
	}, [organizationsQuery.data, search, typeFilter]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

	useEffect(() => {
		setCurrentPage(1);
	}, [search, typeFilter]);

	useEffect(() => {
		if (currentPage > pageCount) setCurrentPage(pageCount);
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filtered.slice(start, start + PAGE_SIZE);
	}, [filtered, currentPage]);

	const pageIds = useMemo(
		() => paged.map((organization) => organization.id),
		[paged],
	);
	const selection = useRowSelection(pageIds);

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
					selection.clear();
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
		if (selection.selectedCount === 0) return;
		const byId = new Map(
			(organizationsQuery.data ?? []).map((org) => [org.id, org]),
		);
		const targets = selection.selectedIds
			.map((id) => byId.get(id))
			.filter((org): org is NonNullable<typeof org> => Boolean(org));
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
					selection.clear();
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
		<div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
			<div className="relative w-full min-w-0 sm:w-72">
				<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search by name or id..."
					className="pl-9"
				/>
			</div>
			<Select
				value={typeFilter}
				onValueChange={(value) => {
					if (value) setTypeFilter(value as TypeFilter);
				}}
			>
				<SelectTrigger className="w-full sm:w-40">
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
					Delete selected
				</Button>
			</DataTableBulkBar>
		) : null;

	return (
		<section className="flex min-h-0 flex-1 flex-col">
			{error && !createOpen ? (
				<p className="shrink-0 text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}

			<DataTableShell
				toolbar={selection.selectedCount > 0 ? undefined : filters}
				bulkBar={bulkBar}
				footer={
					!organizationsQuery.isPending &&
						!organizationsQuery.isError &&
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
				{organizationsQuery.isPending ? (
					<DataTableBody>
						<TableBodySkeleton
							headers={["", "Name", "Type", "Created", "Actions"]}
							columns={[
								{ type: "action" },
								{ type: "lines", widths: ["w-40", "w-20"] },
								{ type: "pill" },
								{ type: "text", width: "w-24" },
								{ type: "action" },
							]}
						/>
					</DataTableBody>
				) : organizationsQuery.isError ? (
					<p
						className="min-h-0 flex-1 p-6 text-sm text-destructive"
						role="alert"
					>
						Unable to load organizations.
					</p>
				) : filtered.length === 0 ? (
					<p className="min-h-0 flex-1 p-6 text-sm text-muted-foreground">
						No organizations found.
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
										disabled={busy}
									/>
									<TableHead>Name</TableHead>
									<TableHead>Created</TableHead>
									<TableHead className="w-12">
										<span className="sr-only">Actions</span>
									</TableHead>
								</DataTableHeaderRow>
							</TableHeader>
							<TableBody>
								{paged.map((organization) => {
									const selected = selection.isSelected(
										organization.id,
									);
									return (
										<TableRow
											key={organization.id}
											className={dataTableRowClass(
												selected,
											)}
										>
											<TableCell className="w-10 px-3">
												<RowCheckbox
													checked={selected}
													onToggle={() =>
														selection.toggle(
															organization.id,
														)
													}
													label={`Select ${organization.name}`}
												/>
											</TableCell>
											<TableCell>
												{organization.name}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{organization.created_at
													? new Date(
														organization.created_at,
													).toLocaleDateString()
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
																void switchOrganization(
																	organization,
																);
															}}
														>
															Switch
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => {
																void fillDemoData(
																	organization,
																);
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
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</DataTableBody>
				)}
			</DataTableShell>

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
