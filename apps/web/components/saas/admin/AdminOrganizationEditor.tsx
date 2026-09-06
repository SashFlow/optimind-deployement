"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import {
	fullOrganizationQueryKey,
	useFullOrganizationQuery,
	useUpdateOrganizationMutation,
} from "@saas/organizations/lib/api";
import { UserAvatar } from "@shared/components/UserAvatar";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CopyIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import {
	mapOrgToAdminOrganization,
	type OrganizationMember,
} from "@/components/saas/admin/lib/types";

function formatRole(role: string) {
	return role.charAt(0).toUpperCase() + role.slice(1);
}

async function copyText(value: string, successMessage: string) {
	try {
		await navigator.clipboard.writeText(value);
		toast.success(successMessage);
	} catch {
		toast.error("Could not copy to clipboard");
	}
}

export function AdminOrganizationEditor({ id }: { id: string }) {
	const queryClient = useQueryClient();
	const organizationQuery = useQuery({
		...orpc.admin.organizations.find.queryOptions({
			input: { id },
		}),
		select: (data) => (data ? mapOrgToAdminOrganization(data) : null),
	});
	const fullOrganizationQuery = useFullOrganizationQuery(id);
	const updateOrganizationMutation = useUpdateOrganizationMutation();

	const organization = organizationQuery.data;
	const [editedName, setEditedName] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (organizationQuery.isPending) {
		return (
			<section className="space-y-6">
				<LoadingState className="p-0" />
			</section>
		);
	}

	if (organizationQuery.isError || !organization) {
		return (
			<section className="space-y-6">
				<div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
					<div className="border-b p-5">
						<p className="font-medium">Organization not found</p>
						<p className="mt-1 text-sm text-muted-foreground">
							This workspace may have been deleted or you may not
							have access.
						</p>
					</div>
					<div className="p-5">
						<Button variant="outline" asChild>
							<Link href="/app/settings/organizations">
								<ArrowLeftIcon className="size-4" />
								Back to organizations
							</Link>
						</Button>
					</div>
				</div>
			</section>
		);
	}

	const currentName = editedName ?? organization.name;
	const isDirty = currentName.trim() !== organization.name.trim();

	const members: OrganizationMember[] = (
		fullOrganizationQuery.data?.members ?? []
	).map((member) => {
		const user = (
			member as {
				user?: { id?: string; name?: string; email?: string };
				userId?: string;
				role?: string;
			}
		).user;
		const userId =
			user?.id ??
			(member as { userId?: string }).userId ??
			(member as { id?: string }).id ??
			"unknown";
		return {
			account_id: userId,
			name: user?.name ?? null,
			email: user?.email ?? null,
			role: (member as { role?: string }).role ?? "member",
		};
	});

	const save = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!currentName.trim() || !isDirty) return;
		setBusy(true);
		setError(null);
		try {
			await updateOrganizationMutation.mutateAsync({
				id,
				name: currentName.trim(),
				updateSlug: organization.name !== currentName.trim(),
			});
			setEditedName(null);
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: orpc.admin.organizations.find.key({
						input: { id },
					}),
				}),
				queryClient.invalidateQueries({
					queryKey: orpc.admin.organizations.list.key(),
				}),
				queryClient.invalidateQueries({
					queryKey: fullOrganizationQueryKey(id),
				}),
			]);
			toast.success("Organization updated");
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Unable to save organization.",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="space-y-5">
			<div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
				<form onSubmit={save} className="p-5">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
						<div className="min-w-0 flex-1 space-y-2">
							<Label htmlFor="edit-organization-name">Name</Label>
							<Input
								id="edit-organization-name"
								required
								value={currentName}
								onChange={(event) =>
									setEditedName(event.target.value)
								}
								disabled={busy}
								className="w-full"
							/>
						</div>
						<Button
							type="submit"
							className="shrink-0 sm:mb-0.5"
							disabled={busy || !currentName.trim() || !isDirty}
						>
							{busy ? "Saving…" : "Save"}
						</Button>
					</div>
					{error ? (
						<p
							className="mt-3 text-sm text-destructive"
							role="alert"
						>
							{error}
						</p>
					) : null}
				</form>
			</div>

			<div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
				<div className="flex items-center justify-between gap-3 border-b px-5 py-4">
					<div>
						<p className="font-medium">Members</p>
						<p className="mt-0.5 text-sm text-muted-foreground">
							Accounts with access to this organization.
						</p>
					</div>
					{!fullOrganizationQuery.isPending &&
					!fullOrganizationQuery.isError ? (
						<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
							<UsersIcon className="size-3.5" />
							{members.length}
						</span>
					) : null}
				</div>
				{fullOrganizationQuery.isPending ? (
					<LoadingState />
				) : fullOrganizationQuery.isError ? (
					<p className="p-6 text-sm text-destructive" role="alert">
						Unable to load members.
					</p>
				) : members.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
						<div className="flex size-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
							<UsersIcon className="size-5" />
						</div>
						<p className="text-sm font-medium">No members yet</p>
						<p className="text-sm text-muted-foreground">
							Accounts added to this organization will appear
							here.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto scrollbar-none">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>Member</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Account</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{members.map((member) => {
									const displayName =
										member.name ??
										member.email ??
										"Unknown member";
									return (
										<TableRow key={member.account_id}>
											<TableCell>
												<div className="flex min-w-0 items-center gap-3">
													<UserAvatar
														name={displayName}
														className="size-8"
													/>
													<div className="min-w-0">
														<p className="truncate font-medium">
															{displayName}
														</p>
														{member.name &&
														member.email ? (
															<p className="truncate text-xs text-muted-foreground">
																{member.email}
															</p>
														) : null}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<span className="inline-flex rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
													{formatRole(member.role)}
												</span>
											</TableCell>
											<TableCell>
												<button
													type="button"
													className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
													onClick={() =>
														void copyText(
															member.account_id,
															"Account ID copied",
														)
													}
													title="Copy account ID"
												>
													<span>
														{member.account_id.slice(
															0,
															8,
														)}
													</span>
													<CopyIcon className="size-3 opacity-60" />
												</button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</section>
	);
}
