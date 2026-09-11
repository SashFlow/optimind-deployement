"use client";

import { authClient } from "@repo/auth/client";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@repo/ui/alert-dialog";
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
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import {
	CheckIcon,
	ChevronDownIcon,
	CopyIcon,
	MoreVerticalIcon,
	PencilIcon,
	SearchIcon,
} from "lucide-react";
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
import { useSettingsPageAction } from "@/context/AdminSettingsActionsProvider";
import { type Account, mapUserToAccount, type Role } from "@/types/admin";

const roles: Role[] = ["admin", "user"];

type StatusFilter = "all" | "active" | "invited" | "inactive";

const STATUS_FILTER_ITEMS: { value: StatusFilter; label: string }[] = [
	{ value: "all", label: "All statuses" },
	{ value: "active", label: "Active" },
	{ value: "invited", label: "Invited" },
	{ value: "inactive", label: "Inactive" },
];

function userStatus(user: Account): "active" | "invited" | "inactive" {
	if (!user.is_active) return "inactive";
	if (user.invite_pending) return "invited";
	return "active";
}

function statusLabel(status: "active" | "invited" | "inactive") {
	if (status === "invited") return "Invited";
	if (status === "inactive") return "Inactive";
	return "Active";
}

function formatJoined(value: string | null | undefined) {
	if (!value) return "—";
	return format(new Date(value), "MMM d, yyyy");
}

function formatLastActive(value: string | null | undefined) {
	if (!value) return "—";
	const date = new Date(value);
	if (isToday(date)) return "Today";
	if (isYesterday(date)) return "Yesterday";
	return formatDistanceToNow(date, { addSuffix: true });
}

function formatRole(role: Role) {
	return role.charAt(0).toUpperCase() + role.slice(1);
}

const ROLE_ITEMS = roles.map((option) => ({
	value: option,
	label: formatRole(option),
}));

async function copyInviteUrl(url: string) {
	try {
		await navigator.clipboard.writeText(url);
		toast.success("Invite link copied");
	} catch {
		toast.error("Could not copy invite link");
	}
}

function randomTempPassword() {
	return `Tmp-${Math.random().toString(36).slice(2, 10)}!9`;
}

export function AdminUsers() {
	const queryClient = useQueryClient();
	const usersQuery = useQuery({
		...orpc.admin.users.list.queryOptions({
			input: {
				limit: 100,
				offset: 0,
			},
		}),
		select: (data) => (data?.users ?? []).map(mapUserToAccount),
	});

	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [busyId, setBusyId] = useState<string | null>(null);

	const [inviteOpen, setInviteOpen] = useState(false);
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<Role>("user");
	const [inviteBusy, setInviteBusy] = useState(false);
	const [inviteError, setInviteError] = useState<string | null>(null);
	const [inviteUrl, setInviteUrl] = useState<string | null>(null);

	const [roleUser, setRoleUser] = useState<Account | null>(null);
	const [nextRole, setNextRole] = useState<Role>("user");
	const [roleBusy, setRoleBusy] = useState(false);
	const [bulkRoleOpen, setBulkRoleOpen] = useState(false);
	const [bulkRole, setBulkRole] = useState<Role>("user");
	const [bulkBusy, setBulkBusy] = useState(false);

	const [removeUser, setRemoveUser] = useState<Account | null>(null);
	const [removeBusy, setRemoveBusy] = useState(false);
	const [revokeMode, setRevokeMode] = useState(false);

	const filtered = useMemo(() => {
		const users = usersQuery.data ?? [];
		const q = search.trim().toLowerCase();
		return users.filter((user) => {
			const status = userStatus(user);
			if (statusFilter !== "all" && status !== statusFilter) return false;
			if (!q) return true;
			return (
				user.name.toLowerCase().includes(q) ||
				user.email.toLowerCase().includes(q)
			);
		});
	}, [usersQuery.data, search, statusFilter]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

	useEffect(() => {
		setCurrentPage(1);
	}, [search, statusFilter]);

	useEffect(() => {
		if (currentPage > pageCount) setCurrentPage(pageCount);
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filtered.slice(start, start + PAGE_SIZE);
	}, [filtered, currentPage]);

	const pageIds = useMemo(() => paged.map((user) => user.id), [paged]);
	const selection = useRowSelection(pageIds);

	const selectedUsers = useMemo(() => {
		const byId = new Map((usersQuery.data ?? []).map((u) => [u.id, u]));
		return selection.selectedIds
			.map((id) => byId.get(id))
			.filter((user): user is Account => Boolean(user));
	}, [selection.selectedIds, usersQuery.data]);

	const selectedInvited = selectedUsers.filter((u) => u.invite_pending);
	const selectedActive = selectedUsers.filter((u) => !u.invite_pending);

	const resetInviteForm = () => {
		setInviteEmail("");
		setInviteRole("user");
		setInviteError(null);
		setInviteUrl(null);
	};

	const handleInviteOpenChange = (open: boolean) => {
		setInviteOpen(open);
		if (!open) resetInviteForm();
	};

	useSettingsPageAction(() => {
		resetInviteForm();
		setInviteOpen(true);
	}, "Invite user");

	const invalidateUsers = async () => {
		await queryClient.invalidateQueries({
			queryKey: orpc.admin.users.list.key(),
		});
	};

	const inviteUser = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!inviteEmail.trim()) return;
		setInviteBusy(true);
		setInviteError(null);
		try {
			const email = inviteEmail.trim();
			const { error } = await authClient.admin.createUser({
				email,
				password: randomTempPassword(),
				name: email.split("@")[0] || email,
				role: inviteRole,
			});
			if (error)
				throw new Error(error.message || "Unable to invite user.");

			await authClient.sendVerificationEmail({ email });
			setInviteUrl(
				new URL("/auth/login", window.location.origin).toString(),
			);
			await invalidateUsers();
			toast.success("User created");
		} catch (cause) {
			setInviteError(
				cause instanceof Error
					? cause.message
					: "Unable to invite user.",
			);
		} finally {
			setInviteBusy(false);
		}
	};

	const setUserRole = async (user: Account, role: Role) => {
		if (user.role === role) return;
		setBusyId(user.id);
		try {
			const { error } = await authClient.admin.setRole({
				userId: user.id,
				role,
			});
			if (error)
				throw new Error(error.message || "Unable to update role.");
			await invalidateUsers();
			toast.success("Role updated");
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Unable to update role.",
			);
		} finally {
			setBusyId(null);
		}
	};

	const reinviteUser = async (user: Account) => {
		setBusyId(user.id);
		try {
			const { error } = await authClient.sendVerificationEmail({
				email: user.email,
			});
			if (error)
				throw new Error(error.message || "Unable to reinvite user.");
			setInviteUrl(
				new URL("/auth/login", window.location.origin).toString(),
			);
			setInviteOpen(true);
			toast.success("Verification email sent");
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Unable to reinvite user.",
			);
		} finally {
			setBusyId(null);
		}
	};

	const saveRole = async () => {
		if (!roleUser) return;
		setRoleBusy(true);
		try {
			await setUserRole(roleUser, nextRole);
			setRoleUser(null);
		} finally {
			setRoleBusy(false);
		}
	};

	const confirmRemove = async () => {
		if (!removeUser) return;
		setRemoveBusy(true);
		try {
			const { error } = await authClient.admin.removeUser({
				userId: removeUser.id,
			});
			if (error)
				throw new Error(
					error.message ||
						(revokeMode
							? "Unable to revoke invite."
							: "Unable to remove user."),
				);
			await invalidateUsers();
			selection.clear();
			setRemoveUser(null);
			toast.success(revokeMode ? "Invite revoked" : "User removed");
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: revokeMode
						? "Unable to revoke invite."
						: "Unable to remove user.",
			);
		} finally {
			setRemoveBusy(false);
			setRevokeMode(false);
		}
	};

	const bulkReinvite = async () => {
		if (selectedInvited.length === 0) return;
		setBulkBusy(true);
		let ok = 0;
		for (const user of selectedInvited) {
			try {
				const { error } = await authClient.sendVerificationEmail({
					email: user.email,
				});
				if (!error) ok += 1;
			} catch {
				// continue
			}
		}
		setBulkBusy(false);
		selection.clear();
		toast.success(
			`Reinvited ${ok} of ${selectedInvited.length} user${selectedInvited.length === 1 ? "" : "s"}`,
		);
	};

	const bulkRevoke = async () => {
		if (selectedInvited.length === 0) return;
		setBulkBusy(true);
		let ok = 0;
		for (const user of selectedInvited) {
			try {
				const { error } = await authClient.admin.removeUser({
					userId: user.id,
				});
				if (!error) ok += 1;
			} catch {
				// continue
			}
		}
		await invalidateUsers();
		setBulkBusy(false);
		selection.clear();
		toast.success(
			`Revoked ${ok} of ${selectedInvited.length} invite${selectedInvited.length === 1 ? "" : "s"}`,
		);
	};

	const bulkRemove = async () => {
		if (selectedActive.length === 0) return;
		setBulkBusy(true);
		let ok = 0;
		for (const user of selectedActive) {
			try {
				const { error } = await authClient.admin.removeUser({
					userId: user.id,
				});
				if (!error) ok += 1;
			} catch {
				// continue
			}
		}
		await invalidateUsers();
		setBulkBusy(false);
		selection.clear();
		toast.success(
			`Removed ${ok} of ${selectedActive.length} user${selectedActive.length === 1 ? "" : "s"}`,
		);
	};

	const bulkSetRole = async () => {
		if (selectedUsers.length === 0) return;
		setBulkBusy(true);
		let ok = 0;
		for (const user of selectedUsers) {
			try {
				const { error } = await authClient.admin.setRole({
					userId: user.id,
					role: bulkRole,
				});
				if (!error) ok += 1;
			} catch {
				// continue
			}
		}
		await invalidateUsers();
		setBulkBusy(false);
		setBulkRoleOpen(false);
		selection.clear();
		toast.success(
			`Updated role for ${ok} of ${selectedUsers.length} user${selectedUsers.length === 1 ? "" : "s"}`,
		);
	};

	const filters = (
		<div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
			<div className="relative w-full min-w-0 sm:w-72">
				<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search by name or email..."
					className="pl-9"
				/>
			</div>
			<Select
				value={statusFilter}
				onValueChange={(value) => {
					if (value) setStatusFilter(value as StatusFilter);
				}}
			>
				<SelectTrigger className="w-full sm:w-40">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{STATUS_FILTER_ITEMS.map((option) => (
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
					disabled={bulkBusy}
					onClick={() => {
						setBulkRole("user");
						setBulkRoleOpen(true);
					}}
				>
					Change role
				</Button>
				{selectedInvited.length > 0 ? (
					<>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={bulkBusy}
							onClick={() => {
								void bulkReinvite();
							}}
						>
							Reinvite
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={bulkBusy}
							className="text-destructive"
							onClick={() => {
								void bulkRevoke();
							}}
						>
							Revoke invite
						</Button>
					</>
				) : null}
				{selectedActive.length > 0 ? (
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={bulkBusy}
						className="text-destructive"
						onClick={() => {
							void bulkRemove();
						}}
					>
						Remove
					</Button>
				) : null}
			</DataTableBulkBar>
		) : null;

	return (
		<section className="flex min-h-0 flex-1 flex-col">
			<DataTableShell
				toolbar={selection.selectedCount > 0 ? undefined : filters}
				bulkBar={bulkBar}
				footer={
					!usersQuery.isPending &&
					!usersQuery.isError &&
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
				{usersQuery.isPending ? (
					<DataTableBody>
						<TableBodySkeleton
							headers={[
								"",
								"User",
								"Joined",
								"Last active",
								"Role",
								"Status",
								"Actions",
							]}
							columns={[
								{ type: "action" },
								{ type: "avatar" },
								{ type: "text", width: "w-24" },
								{ type: "text", width: "w-24" },
								{ type: "text", width: "w-16" },
								{ type: "pill" },
								{ type: "action" },
							]}
						/>
					</DataTableBody>
				) : usersQuery.isError ? (
					<p
						className="min-h-0 flex-1 p-6 text-sm text-destructive"
						role="alert"
					>
						Unable to load users.
					</p>
				) : filtered.length === 0 ? (
					<p className="min-h-0 flex-1 p-6 text-sm text-muted-foreground">
						No users found.
					</p>
				) : (
					<DataTableBody>
						<Table>
							<TableHeader>
								<DataTableHeaderRow>
									<SelectColumnHead
										allSelected={selection.allPageSelected}
										someSelected={selection.somePageSelected}
										onToggle={selection.togglePage}
									/>
									<TableHead>Name</TableHead>
									<TableHead>Joined</TableHead>
									<TableHead>Last active</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-20">
										<span className="sr-only">Actions</span>
									</TableHead>
								</DataTableHeaderRow>
							</TableHeader>
							<TableBody>
								{paged.map((user) => {
									const status = userStatus(user);
									const selected = selection.isSelected(
										user.id,
									);
									return (
										<TableRow
											key={user.id}
											className={dataTableRowClass(
												selected,
											)}
										>
											<TableCell className="w-10 px-3">
												<RowCheckbox
													checked={selected}
													onToggle={() =>
														selection.toggle(
															user.id,
														)
													}
													label={`Select ${user.name}`}
												/>
											</TableCell>
											<TableCell>
												<IdentityCell
													name={user.name}
													secondary={user.email}
												/>
											</TableCell>
											<TableCell className="text-muted-foreground">
												{formatJoined(user.created_at)}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{formatLastActive(
													user.last_login_at,
												)}
											</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger
														asChild
													>
														<button
															type="button"
															disabled={
																busyId ===
																user.id
															}
															className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-sm font-medium hover:bg-muted"
														>
															{formatRole(
																user.role,
															)}
															<ChevronDownIcon className="size-3.5 text-muted-foreground" />
														</button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="start">
														{ROLE_ITEMS.map(
															(option) => (
																<DropdownMenuItem
																	key={
																		option.value
																	}
																	onClick={() => {
																		void setUserRole(
																			user,
																			option.value,
																		);
																	}}
																>
																	<span className="flex flex-1 items-center justify-between gap-4">
																		{
																			option.label
																		}
																		{user.role ===
																		option.value ? (
																			<CheckIcon className="size-4" />
																		) : null}
																	</span>
																</DropdownMenuItem>
															),
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
											<TableCell>
												<StatusBadge
													label={statusLabel(status)}
													tone={status}
												/>
											</TableCell>
											<TableCell>
												<div className="flex items-center justify-end gap-1">
													<Button
														variant="ghost"
														size="icon"
														className={cn(
															"size-8 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100",
															selected &&
																"opacity-100",
														)}
														disabled={
															busyId === user.id
														}
														aria-label={`Edit ${user.name}`}
														onClick={() => {
															setRoleUser(user);
															setNextRole(
																user.role,
															);
														}}
													>
														<PencilIcon className="size-4" />
													</Button>
													<DropdownMenu>
														<DropdownMenuTrigger
															asChild
														>
															<Button
																variant="ghost"
																size="icon"
																className="size-8"
																disabled={
																	busyId ===
																	user.id
																}
																aria-label={`Actions for ${user.name}`}
															>
																<MoreVerticalIcon className="size-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{user.invite_pending ? (
																<>
																	<DropdownMenuItem
																		onClick={() => {
																			void reinviteUser(
																				user,
																			);
																		}}
																	>
																		Reinvite
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		className="text-destructive focus:text-destructive"
																		onClick={() => {
																			setRevokeMode(
																				true,
																			);
																			setRemoveUser(
																				user,
																			);
																		}}
																	>
																		Revoke
																		invite
																	</DropdownMenuItem>
																	<DropdownMenuSeparator />
																</>
															) : null}
															<DropdownMenuItem
																onClick={() => {
																	setRoleUser(
																		user,
																	);
																	setNextRole(
																		user.role,
																	);
																}}
															>
																Change role
															</DropdownMenuItem>
															{!user.invite_pending ? (
																<>
																	<DropdownMenuSeparator />
																	<DropdownMenuItem
																		className="text-destructive focus:text-destructive"
																		onClick={() => {
																			setRevokeMode(
																				false,
																			);
																			setRemoveUser(
																				user,
																			);
																		}}
																	>
																		Remove
																	</DropdownMenuItem>
																</>
															) : null}
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</DataTableBody>
				)}
			</DataTableShell>

			<Dialog open={inviteOpen} onOpenChange={handleInviteOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{inviteUrl ? "Invite link" : "Invite user"}
						</DialogTitle>
						<DialogDescription>
							{inviteUrl
								? "Share this sign-in link with the invitee."
								: "Create a user with a role. They can verify email and set a password."}
						</DialogDescription>
					</DialogHeader>
					{inviteUrl ? (
						<div className="space-y-3">
							<div className="flex gap-2">
								<Input
									readOnly
									value={inviteUrl}
									className="font-mono text-xs"
								/>
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={() => {
										void copyInviteUrl(inviteUrl);
									}}
								>
									<CopyIcon className="size-4" />
								</Button>
							</div>
							<DialogFooter>
								<Button
									type="button"
									onClick={() =>
										handleInviteOpenChange(false)
									}
								>
									Done
								</Button>
							</DialogFooter>
						</div>
					) : (
						<form onSubmit={inviteUser} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="invite-email">Email</Label>
								<Input
									id="invite-email"
									type="email"
									required
									value={inviteEmail}
									onChange={(event) =>
										setInviteEmail(event.target.value)
									}
									placeholder="growth@sashflow.com"
									disabled={inviteBusy}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="invite-role">Role</Label>
								<Select
									value={inviteRole}
									onValueChange={(value) => {
										if (value) setInviteRole(value as Role);
									}}
									disabled={inviteBusy}
								>
									<SelectTrigger
										id="invite-role"
										className="w-full"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{ROLE_ITEMS.map((option) => (
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
							{inviteError ? (
								<p
									className="text-sm text-destructive"
									role="alert"
								>
									{inviteError}
								</p>
							) : null}
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										handleInviteOpenChange(false)
									}
									disabled={inviteBusy}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={inviteBusy || !inviteEmail.trim()}
								>
									{inviteBusy ? "Inviting…" : "Send invite"}
								</Button>
							</DialogFooter>
						</form>
					)}
				</DialogContent>
			</Dialog>

			<Dialog
				open={roleUser !== null}
				onOpenChange={(open) => {
					if (!open) setRoleUser(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change role</DialogTitle>
						<DialogDescription>
							Update the platform role for {roleUser?.name}.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="change-role">Role</Label>
						<Select
							value={nextRole}
							onValueChange={(value) => {
								if (value) setNextRole(value as Role);
							}}
							disabled={roleBusy}
						>
							<SelectTrigger id="change-role" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ROLE_ITEMS.map((option) => (
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
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setRoleUser(null)}
							disabled={roleBusy}
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={() => {
								void saveRole();
							}}
							disabled={
								roleBusy ||
								!roleUser ||
								nextRole === roleUser.role
							}
						>
							{roleBusy ? "Saving…" : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={bulkRoleOpen} onOpenChange={setBulkRoleOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change role</DialogTitle>
						<DialogDescription>
							Set a role for {selection.selectedCount} selected
							user{selection.selectedCount === 1 ? "" : "s"}.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="bulk-role">Role</Label>
						<Select
							value={bulkRole}
							onValueChange={(value) => {
								if (value) setBulkRole(value as Role);
							}}
							disabled={bulkBusy}
						>
							<SelectTrigger id="bulk-role" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ROLE_ITEMS.map((option) => (
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
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setBulkRoleOpen(false)}
							disabled={bulkBusy}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={bulkBusy}
							onClick={() => {
								void bulkSetRole();
							}}
						>
							{bulkBusy ? "Saving…" : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={removeUser !== null}
				onOpenChange={(open) => {
					if (!open) {
						setRemoveUser(null);
						setRevokeMode(false);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{revokeMode ? "Revoke invite?" : "Remove user?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{revokeMode
								? `This will revoke the pending invite for ${removeUser?.name}. They will not be able to join with the previous invite.`
								: `This will remove ${removeUser?.name}'s account. They will no longer be able to sign in.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={removeBusy}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={removeBusy}
							onClick={(event) => {
								event.preventDefault();
								void confirmRemove();
							}}
						>
							{removeBusy
								? revokeMode
									? "Revoking…"
									: "Removing…"
								: revokeMode
									? "Revoke invite"
									: "Remove"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
