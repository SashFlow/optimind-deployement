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
import { orpcClient } from "@shared/lib/orpc-client";
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
	dataTableRowClass,
	IdentityCell,
	RowCheckbox,
	SelectColumnHead,
	StatusBadge,
} from "@/components/saas/shared/DataTable";
import { PAGE_SIZE, Pagination } from "@/components/saas/shared/Pagination";
import { TableBodySkeleton } from "@/components/saas/shared/skeletons";
import { useRowSelection } from "@/components/saas/shared/useRowSelection";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { useSettingsPageAction } from "@/context/AdminSettingsActionsProvider";
import {
	type Account,
	type AccountMembership,
	mapUserToAccount,
	type OrganizationMemberRole,
	type Role,
} from "@/types/admin";

const platformRoles: Role[] = ["admin", "user"];
const organizationRoles: OrganizationMemberRole[] = [
	"owner",
	"admin",
	"member",
];

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

function formatRole(role: string) {
	return role.charAt(0).toUpperCase() + role.slice(1);
}

const PLATFORM_ROLE_ITEMS = platformRoles.map((option) => ({
	value: option,
	label: formatRole(option),
}));

const ORGANIZATION_ROLE_ITEMS = organizationRoles.map((option) => ({
	value: option,
	label: formatRole(option),
}));

function membershipForOrganization(
	user: Account,
	organizationId: string | null | undefined,
): AccountMembership | null {
	if (!organizationId) return null;
	return (
		user.memberships.find(
			(membership) => membership.organizationId === organizationId,
		) ?? null
	);
}

async function copyInviteUrl(url: string) {
	try {
		await navigator.clipboard.writeText(url);
		toast.success("Invite link copied");
	} catch {
		toast.error("Could not copy invite link");
	}
}

type PendingInvitation = {
	id: string;
	email: string;
	role: OrganizationMemberRole;
	platformRole?: Role | null;
	organizationId: string;
	expiresAt: string;
	status: string;
};

type MemberListItem = Account & {
	pendingInvitationId?: string;
	pendingInvitationRole?: OrganizationMemberRole;
	pendingInvitationPlatformRole?: Role;
};

function mapInvitationToListItem(
	invitation: PendingInvitation,
): MemberListItem {
	const role = (
		["owner", "admin", "member"].includes(invitation.role)
			? invitation.role
			: "member"
	) as OrganizationMemberRole;
	const platformRole: Role =
		invitation.platformRole === "admin" ? "admin" : "user";
	return {
		id: `invite:${invitation.id}`,
		name: invitation.email,
		email: invitation.email,
		role: platformRole,
		memberships: [],
		is_active: true,
		invite_pending: true,
		created_at: null,
		last_login_at: null,
		pendingInvitationId: invitation.id,
		pendingInvitationRole: role,
		pendingInvitationPlatformRole: platformRole,
	};
}

export function AdminUsers({
	isSuperAdmin = false,
}: {
	isSuperAdmin?: boolean;
}) {
	const queryClient = useQueryClient();
	const { activeOrganization } = useActiveOrganization();
	const activeOrganizationId = activeOrganization?.id ?? null;
	const usersQuery = useQuery({
		...orpc.admin.users.list.queryOptions({
			input: {
				limit: 100,
				offset: 0,
			},
		}),
		select: (data: unknown) => {
			const payload = data as {
				users?: Parameters<typeof mapUserToAccount>[0][];
			} | null;
			return (payload?.users ?? []).map(mapUserToAccount);
		},
	});

	const invitationsQuery = useQuery({
		...orpc.admin.invitations.list.queryOptions({
			input: {
				organizationId: activeOrganizationId ?? "",
			},
		}),
		enabled: Boolean(activeOrganizationId),
	});

	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [busyId, setBusyId] = useState<string | null>(null);

	const [inviteOpen, setInviteOpen] = useState(false);
	const [inviteEmail, setInviteEmail] = useState("");
	const [invitePlatformRole, setInvitePlatformRole] = useState<Role>("user");
	const [inviteOrgRole, setInviteOrgRole] =
		useState<OrganizationMemberRole>("member");
	const [inviteBusy, setInviteBusy] = useState(false);
	const [inviteError, setInviteError] = useState<string | null>(null);
	const [inviteUrl, setInviteUrl] = useState<string | null>(null);

	const [roleUser, setRoleUser] = useState<Account | null>(null);
	const [nextRole, setNextRole] = useState<Role>("user");
	const [nextOrgRole, setNextOrgRole] =
		useState<OrganizationMemberRole>("member");
	const [roleBusy, setRoleBusy] = useState(false);
	const [bulkRoleOpen, setBulkRoleOpen] = useState(false);
	const [bulkRole, setBulkRole] = useState<Role>("user");
	const [bulkOrgRole, setBulkOrgRole] =
		useState<OrganizationMemberRole>("member");
	const [bulkBusy, setBulkBusy] = useState(false);

	const [removeUser, setRemoveUser] = useState<MemberListItem | null>(null);
	const [removeBusy, setRemoveBusy] = useState(false);
	const [revokeMode, setRevokeMode] = useState(false);

	const users = useMemo((): MemberListItem[] => {
		const accounts = (usersQuery.data ?? []).map((user) => ({
			...user,
			invite_pending: false,
		}));
		const pending = (invitationsQuery.data?.invitations ??
			[]) as PendingInvitation[];
		const accountEmails = new Set(
			accounts.map((user) => user.email.toLowerCase()),
		);
		const inviteRows = pending
			.filter(
				(invitation) =>
					!accountEmails.has(invitation.email.toLowerCase()),
			)
			.map(mapInvitationToListItem);
		return [...inviteRows, ...accounts];
	}, [usersQuery.data, invitationsQuery.data]);

	const filtered = useMemo(() => {
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
	}, [users, search, statusFilter]);

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
		const byId = new Map(users.map((u) => [u.id, u]));
		return selection.selectedIds
			.map((id) => byId.get(id))
			.filter((user): user is MemberListItem => Boolean(user));
	}, [selection.selectedIds, users]);

	const selectedInvited = selectedUsers.filter((u) => u.invite_pending);
	const selectedActive = selectedUsers.filter((u) => !u.invite_pending);

	const resetInviteForm = () => {
		setInviteEmail("");
		setInvitePlatformRole("user");
		setInviteOrgRole("member");
		setInviteError(null);
		setInviteUrl(null);
	};

	const openRoleEditor = (user: Account) => {
		const membership = membershipForOrganization(
			user,
			activeOrganizationId,
		);
		setRoleUser(user);
		setNextRole(user.role);
		setNextOrgRole(membership?.role ?? "member");
	};

	const handleInviteOpenChange = (open: boolean) => {
		setInviteOpen(open);
		if (!open) resetInviteForm();
	};

	useSettingsPageAction(() => {
		resetInviteForm();
		setInviteOpen(true);
	}, "Invite");

	const invalidateUsers = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.admin.users.list.key(),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.admin.invitations.list.key(),
			}),
		]);
	};

	const setOrganizationMembership = async ({
		userId,
		organizationId,
		role,
		memberId,
	}: {
		userId: string;
		organizationId: string;
		role: OrganizationMemberRole;
		memberId?: string;
	}) => {
		await orpcClient.admin.users.setOrganizationMembership({
			userId,
			organizationId,
			role,
			memberId,
		});
	};

	const inviteUser = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!inviteEmail.trim()) return;
		if (!activeOrganizationId) {
			setInviteError("No active organization selected.");
			return;
		}
		setInviteBusy(true);
		setInviteError(null);
		try {
			const email = inviteEmail.trim();
			const invite = await orpcClient.admin.invitations.invite({
				email,
				organizationId: activeOrganizationId,
				role: inviteOrgRole,
				...(isSuperAdmin ? { platformRole: invitePlatformRole } : {}),
			});
			setInviteUrl(invite.inviteUrl);
			await invalidateUsers();
			if (invite.emailSent) {
				toast.success("Invite email sent");
			} else {
				toast.warning(
					invite.emailError
						? `Invitation created, but email failed: ${invite.emailError}. Copy the invite link instead.`
						: "Invitation created, but email failed. Copy the invite link instead.",
				);
			}
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
		if (!isSuperAdmin || user.invite_pending || user.role === role) return;
		if (user.id.startsWith("invite:")) return;
		setBusyId(user.id);
		try {
			const { error } = await authClient.admin.setRole({
				userId: user.id,
				role,
			});
			if (error)
				throw new Error(error.message || "Unable to update role.");
			await invalidateUsers();
			toast.success("Platform role updated");
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

	const setUserOrganizationRole = async (
		user: Account,
		organizationId: string,
		role: OrganizationMemberRole,
	) => {
		const membership = user.memberships.find(
			(item) => item.organizationId === organizationId,
		);
		if (membership?.role === role) return;
		setBusyId(user.id);
		try {
			await setOrganizationMembership({
				userId: user.id,
				organizationId,
				role,
				memberId: membership?.id,
			});
			await invalidateUsers();
			toast.success("Organization role updated");
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Unable to update organization role.",
			);
		} finally {
			setBusyId(null);
		}
	};

	const reinviteUser = async (user: MemberListItem) => {
		if (!activeOrganizationId) {
			toast.error("No active organization selected.");
			return;
		}
		setBusyId(user.id);
		try {
			const invite = await orpcClient.admin.invitations.reinvite({
				email: user.email,
				organizationId: activeOrganizationId,
				role: user.pendingInvitationRole ?? "member",
				...(isSuperAdmin
					? {
						platformRole:
							user.pendingInvitationPlatformRole ?? "user",
					}
					: {}),
			});
			setInviteUrl(invite.inviteUrl);
			setInviteOpen(true);
			await invalidateUsers();
			if (invite.emailSent) {
				toast.success("Invite email sent");
			} else {
				toast.warning(
					invite.emailError
						? `Email failed: ${invite.emailError}. Copy the invite link instead.`
						: "Email failed. Copy the invite link instead.",
				);
			}
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
		if (roleUser.invite_pending || roleUser.id.startsWith("invite:")) {
			toast.error(
				"Pending invites cannot change roles yet. Revoke and reinvite with the desired roles.",
			);
			return;
		}
		if (!activeOrganizationId) {
			toast.error("No active organization selected.");
			return;
		}
		setRoleBusy(true);
		try {
			const membership = membershipForOrganization(
				roleUser,
				activeOrganizationId,
			);
			const platformChanged = isSuperAdmin && nextRole !== roleUser.role;
			const orgChanged = membership?.role !== nextOrgRole || !membership;

			if (platformChanged) {
				const { error } = await authClient.admin.setRole({
					userId: roleUser.id,
					role: nextRole,
				});
				if (error)
					throw new Error(error.message || "Unable to update role.");
			}

			if (orgChanged) {
				await setOrganizationMembership({
					userId: roleUser.id,
					organizationId: activeOrganizationId,
					role: nextOrgRole,
					memberId: membership?.id,
				});
			}

			await invalidateUsers();
			setRoleUser(null);
			toast.success("Roles updated");
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Unable to update roles.",
			);
		} finally {
			setRoleBusy(false);
		}
	};

	const confirmRemove = async () => {
		if (!removeUser) return;
		setRemoveBusy(true);
		try {
			if (revokeMode) {
				if (!activeOrganizationId) {
					throw new Error("No active organization selected.");
				}
				await orpcClient.admin.invitations.revoke({
					email: removeUser.email,
					organizationId: activeOrganizationId,
				});
			} else {
				if (removeUser.pendingInvitationId) {
					throw new Error(
						"Use revoke invite for pending invitations.",
					);
				}
				const { error } = await authClient.admin.removeUser({
					userId: removeUser.id,
				});
				if (error)
					throw new Error(error.message || "Unable to remove user.");
			}
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
		if (selectedInvited.length === 0 || !activeOrganizationId) return;
		setBulkBusy(true);
		let ok = 0;
		for (const user of selectedInvited) {
			try {
				await orpcClient.admin.invitations.reinvite({
					email: user.email,
					organizationId: activeOrganizationId,
					role: user.pendingInvitationRole ?? "member",
					...(isSuperAdmin
						? {
							platformRole:
								user.pendingInvitationPlatformRole ??
								"user",
						}
						: {}),
				});
				ok += 1;
			} catch {
				// continue
			}
		}
		await invalidateUsers();
		setBulkBusy(false);
		selection.clear();
		toast.success(
			`Reinvited ${ok} of ${selectedInvited.length} user${selectedInvited.length === 1 ? "" : "s"}`,
		);
	};

	const bulkRevoke = async () => {
		if (selectedInvited.length === 0 || !activeOrganizationId) return;
		setBulkBusy(true);
		let ok = 0;
		for (const user of selectedInvited) {
			try {
				await orpcClient.admin.invitations.revoke({
					email: user.email,
					organizationId: activeOrganizationId,
				});
				ok += 1;
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
		const eligible = selectedUsers.filter((user) => !user.invite_pending);
		for (const user of eligible) {
			try {
				if (isSuperAdmin) {
					const { error } = await authClient.admin.setRole({
						userId: user.id,
						role: bulkRole,
					});
					if (error) continue;
				}

				if (activeOrganizationId) {
					const membership = membershipForOrganization(
						user,
						activeOrganizationId,
					);
					await setOrganizationMembership({
						userId: user.id,
						organizationId: activeOrganizationId,
						role: bulkOrgRole,
						memberId: membership?.id,
					});
				}
				ok += 1;
			} catch {
				// continue
			}
		}
		await invalidateUsers();
		setBulkBusy(false);
		setBulkRoleOpen(false);
		selection.clear();
		toast.success(
			`Updated roles for ${ok} of ${eligible.length} user${eligible.length === 1 ? "" : "s"}`,
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
						setBulkOrgRole("member");
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
						!invitationsQuery.isPending &&
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
				{usersQuery.isPending ||
					(Boolean(activeOrganizationId) &&
						invitationsQuery.isPending) ? (
					<DataTableBody>
						<TableBodySkeleton
							headers={[
								"",
								"User",
								"Joined",
								"Last active",
								...(isSuperAdmin ? ["Platform role"] : []),
								"Org role",
								"Status",
								"Actions",
							]}
							columns={[
								{ type: "action" },
								{ type: "avatar" },
								{ type: "text", width: "w-24" },
								{ type: "text", width: "w-24" },
								...(isSuperAdmin
									? [{ type: "text" as const, width: "w-16" }]
									: []),
								{ type: "text", width: "w-28" },
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
										someSelected={
											selection.somePageSelected
										}
										onToggle={selection.togglePage}
									/>
									<TableHead>Name</TableHead>
									<TableHead>Joined</TableHead>
									<TableHead>Last active</TableHead>
									{isSuperAdmin ? (
										<TableHead>Platform role</TableHead>
									) : null}
									<TableHead>Org role</TableHead>
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
											{isSuperAdmin ? (
												<TableCell>
													{user.invite_pending ? (
														<span className="text-sm font-medium">
															{formatRole(
																user.role,
															)}
														</span>
													) : (
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
																{PLATFORM_ROLE_ITEMS.map(
																	(
																		option,
																	) => (
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
													)}
												</TableCell>
											) : null}
											<TableCell>
												{(() => {
													const membership =
														membershipForOrganization(
															user,
															activeOrganizationId,
														);
													if (
														!membership ||
														!activeOrganizationId
													) {
														return (
															<span className="text-sm text-muted-foreground">
																—
															</span>
														);
													}
													return (
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
																		membership.role,
																	)}
																	<ChevronDownIcon className="size-3.5 text-muted-foreground" />
																</button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="start">
																{ORGANIZATION_ROLE_ITEMS.map(
																	(
																		option,
																	) => (
																		<DropdownMenuItem
																			key={
																				option.value
																			}
																			onClick={() => {
																				void setUserOrganizationRole(
																					user,
																					activeOrganizationId,
																					option.value,
																				);
																			}}
																		>
																			<span className="flex flex-1 items-center justify-between gap-4">
																				{
																					option.label
																				}
																				{membership.role ===
																					option.value ? (
																					<CheckIcon className="size-4" />
																				) : null}
																			</span>
																		</DropdownMenuItem>
																	),
																)}
															</DropdownMenuContent>
														</DropdownMenu>
													);
												})()}
											</TableCell>
											<TableCell>
												<StatusBadge
													label={statusLabel(status)}
													tone={status}
												/>
											</TableCell>
											<TableCell>
												<div className="flex items-center justify-end gap-1">
													{!user.invite_pending ? (
														<Button
															variant="ghost"
															size="icon"
															className={cn(
																"size-8 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100",
																selected &&
																"opacity-100",
															)}
															disabled={
																busyId ===
																user.id
															}
															aria-label={`Edit ${user.name}`}
															onClick={() => {
																openRoleEditor(
																	user,
																);
															}}
														>
															<PencilIcon className="size-4" />
														</Button>
													) : null}
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
																</>
															) : (
																<>
																	<DropdownMenuItem
																		onClick={() => {
																			openRoleEditor(
																				user,
																			);
																		}}
																	>
																		Change
																		roles
																	</DropdownMenuItem>
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
															)}
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
							{inviteUrl ? "Invite sent" : "Invite user"}
						</DialogTitle>
						<DialogDescription>
							{inviteUrl
								? "We emailed a signup link. You can also copy and share it below."
								: activeOrganizationId
									? "Send an organization invitation. They will create their account via the signup link."
									: "Select an active organization before inviting."}
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
									disabled={
										inviteBusy || !activeOrganizationId
									}
								/>
							</div>
							{isSuperAdmin ? (
								<div className="space-y-2">
									<Label htmlFor="invite-platform-role">
										Platform role
									</Label>
									<Select
										value={invitePlatformRole}
										onValueChange={(value) => {
											if (value) {
												setInvitePlatformRole(
													value as Role,
												);
											}
										}}
										disabled={
											inviteBusy || !activeOrganizationId
										}
									>
										<SelectTrigger
											id="invite-platform-role"
											className="w-full"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{PLATFORM_ROLE_ITEMS.map(
												(option) => (
													<SelectItem
														key={option.value}
														value={option.value}
													>
														{option.label}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>
							) : null}
							<div className="space-y-2">
								<Label htmlFor="invite-org-role">
									Organization role
								</Label>
								<Select
									value={inviteOrgRole}
									onValueChange={(value) => {
										if (value) {
											setInviteOrgRole(
												value as OrganizationMemberRole,
											);
										}
									}}
									disabled={
										inviteBusy || !activeOrganizationId
									}
								>
									<SelectTrigger
										id="invite-org-role"
										className="w-full"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{ORGANIZATION_ROLE_ITEMS.map(
											(option) => (
												<SelectItem
													key={option.value}
													value={option.value}
												>
													{option.label}
												</SelectItem>
											),
										)}
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
									disabled={
										inviteBusy ||
										!inviteEmail.trim() ||
										!activeOrganizationId
									}
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
						<DialogTitle>Change roles</DialogTitle>
						<DialogDescription>
							{isSuperAdmin
								? `Update platform and organization roles for ${roleUser?.name}.`
								: `Update the organization role for ${roleUser?.name}.`}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{isSuperAdmin ? (
							<div className="space-y-2">
								<Label htmlFor="change-role">
									Platform role
								</Label>
								<Select
									value={nextRole}
									onValueChange={(value) => {
										if (value) setNextRole(value as Role);
									}}
									disabled={roleBusy}
								>
									<SelectTrigger
										id="change-role"
										className="w-full"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PLATFORM_ROLE_ITEMS.map((option) => (
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
						) : null}
						<div className="space-y-2">
							<Label htmlFor="change-org-role">
								Organization role
							</Label>
							<Select
								value={nextOrgRole}
								onValueChange={(value) => {
									if (value) {
										setNextOrgRole(
											value as OrganizationMemberRole,
										);
									}
								}}
								disabled={roleBusy || !activeOrganizationId}
							>
								<SelectTrigger
									id="change-org-role"
									className="w-full"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ORGANIZATION_ROLE_ITEMS.map((option) => (
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
								!activeOrganizationId ||
								((!isSuperAdmin ||
									nextRole === roleUser.role) &&
									membershipForOrganization(
										roleUser,
										activeOrganizationId,
									)?.role === nextOrgRole)
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
						<DialogTitle>Change roles</DialogTitle>
						<DialogDescription>
							{isSuperAdmin
								? `Set platform and organization roles for ${selection.selectedCount} selected user${selection.selectedCount === 1 ? "" : "s"}.`
								: `Set organization roles for ${selection.selectedCount} selected user${selection.selectedCount === 1 ? "" : "s"}.`}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{isSuperAdmin ? (
							<div className="space-y-2">
								<Label htmlFor="bulk-role">Platform role</Label>
								<Select
									value={bulkRole}
									onValueChange={(value) => {
										if (value) setBulkRole(value as Role);
									}}
									disabled={bulkBusy}
								>
									<SelectTrigger
										id="bulk-role"
										className="w-full"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PLATFORM_ROLE_ITEMS.map((option) => (
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
						) : null}
						<div className="space-y-2">
							<Label htmlFor="bulk-org-role">
								Organization role
							</Label>
							<Select
								value={bulkOrgRole}
								onValueChange={(value) => {
									if (value) {
										setBulkOrgRole(
											value as OrganizationMemberRole,
										);
									}
								}}
								disabled={bulkBusy || !activeOrganizationId}
							>
								<SelectTrigger
									id="bulk-org-role"
									className="w-full"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ORGANIZATION_ROLE_ITEMS.map((option) => (
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
							disabled={bulkBusy || !activeOrganizationId}
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
								? `This will delete the pending invite for ${removeUser?.email} and remove any org membership for this organization.`
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
