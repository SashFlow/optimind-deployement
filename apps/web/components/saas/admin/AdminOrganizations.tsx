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
import { cn } from "@repo/ui/utils";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVerticalIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PAGE_SIZE, Pagination } from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
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
	});

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

	const deleteOrganization = async (id: string, organizationName: string) => {
		if (!window.confirm(`Delete ${organizationName}?`)) return;
		setBusy(true);
		setError(null);
		try {
			const { error: deleteError } = await authClient.organization.delete(
				{
					organizationId: id,
				},
			);
			if (deleteError) {
				throw new Error(
					deleteError.message || "Unable to delete organization.",
				);
			}
			await queryClient.invalidateQueries({
				queryKey: orpc.admin.organizations.list.key(),
			});
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
	};

	return (
		<section className="space-y-6">
			{error && !createOpen ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}

			<div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
				<div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-end">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<div className="relative min-w-0 sm:w-72">
							<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) =>
									setSearch(event.target.value)
								}
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
									<SelectItem
										key={option.value}
										value={option.value}
									>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{organizationsQuery.isPending ? (
					<TableBodySkeleton
						headers={["Name", "Type", "Created", "Actions"]}
						columns={[
							{ type: "lines", widths: ["w-40", "w-20"] },
							{ type: "pill" },
							{ type: "text", width: "w-24" },
							{ type: "action" },
						]}
					/>
				) : organizationsQuery.isError ? (
					<p className="p-6 text-sm text-destructive" role="alert">
						Unable to load organizations.
					</p>
				) : filtered.length === 0 ? (
					<p className="p-6 text-sm text-muted-foreground">
						No organizations found.
					</p>
				) : (
					<>
						<div className="overflow-x-auto scrollbar-none">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>Name</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Created</TableHead>
										<TableHead className="w-12">
											<span className="sr-only">
												Actions
											</span>
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paged.map((organization) => (
										<TableRow key={organization.id}>
											<TableCell>
												<div className="min-w-0">
													<p className="truncate font-medium">
														{organization.name}
													</p>
													<p className="font-mono text-xs text-muted-foreground">
														{organization.id.slice(
															0,
															8,
														)}
													</p>
												</div>
											</TableCell>
											<TableCell>
												<span
													className={cn(
														"inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
														organization.trial
															? "bg-violet-50 text-violet-700"
															: "bg-slate-50 text-slate-700",
													)}
												>
													{organization.trial
														? "Trial"
														: "Workspace"}
												</span>
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
									))}
								</TableBody>
							</Table>
						</div>
						<footer className="border-t px-5 py-3">
							<Pagination
								totalItems={filtered.length}
								itemsPerPage={PAGE_SIZE}
								currentPage={currentPage}
								onChangeCurrentPage={setCurrentPage}
							/>
						</footer>
					</>
				)}
			</div>

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
