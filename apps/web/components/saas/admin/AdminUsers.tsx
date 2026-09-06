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
import { UserAvatar } from "@shared/components/UserAvatar";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { CopyIcon, MoreVerticalIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSettingsPageAction } from "@/components/saas/admin/AdminSettingsActions";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import {
	type Account,
	mapUserToAccount,
	type Role,
} from "@/components/saas/admin/lib/types";
import { Pagination } from "@/components/saas/shared/Pagination";

const ITEMS_PER_PAGE = 10;
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

	const [removeUser, setRemoveUser] = useState<Account | null>(null);
	const [removeBusy, setRemoveBusy] = useState(false);

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

	const pageCount = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

	useEffect(() => {
		setCurrentPage(1);
	}, [search, statusFilter]);

	useEffect(() => {
		if (currentPage > pageCount) setCurrentPage(pageCount);
	}, [currentPage, pageCount]);

	const paged = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filtered.slice(start, start + ITEMS_PER_PAGE);
	}, [filtered, currentPage]);

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
	});

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
			const { error } = await authClient.admin.setRole({
				userId: roleUser.id,
				role: nextRole,
			});
			if (error)
				throw new Error(error.message || "Unable to update role.");
			await invalidateUsers();
			setRoleUser(null);
			toast.success("Role updated");
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Unable to update role.",
			);
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
				throw new Error(error.message || "Unable to remove user.");
			await invalidateUsers();
			setRemoveUser(null);
			toast.success("User removed");
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Unable to remove user.",
			);
		} finally {
			setRemoveBusy(false);
		}
	};

	return (
		<section className="space-y-6">
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
								placeholder="Search by name or email..."
								className="pl-9"
							/>
						</div>
						<Select
							value={statusFilter}
							onValueChange={(value) => {
								if (value)
									setStatusFilter(value as StatusFilter);
							}}
						>
							<SelectTrigger className="w-full sm:w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STATUS_FILTER_ITEMS.map((option) => (
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

				{usersQuery.isPending ? (
					<LoadingState />
				) : usersQuery.isError ? (
					<p className="p-6 text-sm text-destructive" role="alert">
						Unable to load users.
					</p>
				) : filtered.length === 0 ? (
					<p className="p-6 text-sm text-muted-foreground">
						No users found.
					</p>
				) : (
					<>
						<div className="overflow-x-auto scrollbar-none">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>User</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Joined</TableHead>
										<TableHead>Last active</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="w-12">
											<span className="sr-only">
												Actions
											</span>
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paged.map((user) => {
										const status = userStatus(user);
										return (
											<TableRow key={user.id}>
												<TableCell>
													<div className="flex min-w-0 items-center gap-3">
														<UserAvatar
															name={user.name}
															className="size-8"
														/>
														<p className="truncate font-medium">
															{user.name}
														</p>
													</div>
												</TableCell>
												<TableCell className="text-muted-foreground">
													{user.email}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{formatJoined(
														user.created_at,
													)}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{formatLastActive(
														user.last_login_at,
													)}
												</TableCell>
												<TableCell>
													{formatRole(user.role)}
												</TableCell>
												<TableCell>
													<span
														className={cn(
															"inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
															status ===
																"active" &&
																"bg-emerald-50 text-emerald-700",
															status ===
																"invited" &&
																"bg-violet-50 text-violet-700",
															status ===
																"inactive" &&
																"bg-rose-50 text-rose-700",
														)}
													>
														{statusLabel(status)}
													</span>
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
																<DropdownMenuItem
																	onClick={() => {
																		void reinviteUser(
																			user,
																		);
																	}}
																>
																	Reinvite
																</DropdownMenuItem>
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
																Change Role
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																className="text-destructive focus:text-destructive"
																onClick={() =>
																	setRemoveUser(
																		user,
																	)
																}
															>
																Remove
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										);
									})}
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
			</div>

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

			<AlertDialog
				open={removeUser !== null}
				onOpenChange={(open) => {
					if (!open) setRemoveUser(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove user?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove {removeUser?.name}&apos;s account.
							They will no longer be able to sign in.
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
							{removeBusy ? "Removing…" : "Remove"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
