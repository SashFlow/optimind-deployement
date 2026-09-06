"use client";

import { Button } from "@repo/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { useFullOrganizationQuery } from "@saas/organizations/lib/api";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";

type MockTrialLink = {
	id: string;
	label: string;
	url: string;
	enabled: boolean;
};

const INITIAL_TRIALS: MockTrialLink[] = [
	{
		id: "trial_mock_1",
		label: "Public demo",
		url: "/share/demo",
		enabled: true,
	},
];

export function AgentAccessControlForm({
	agentId,
	organizationId,
}: {
	agentId: string;
	organizationId: string;
}) {
	const orgQuery = useFullOrganizationQuery(organizationId);
	const [trials, setTrials] = useState(INITIAL_TRIALS);
	const [label, setLabel] = useState("");
	const [orgAccessEnabled, setOrgAccessEnabled] = useState(true);

	const members = useMemo(() => {
		return (orgQuery.data?.members ?? []).map((member) => {
			const user = (
				member as {
					user?: { id?: string; name?: string; email?: string };
					userId?: string;
					role?: string;
				}
			).user;
			return {
				id:
					user?.id ??
					(member as { userId?: string }).userId ??
					"unknown",
				name: user?.name ?? "Member",
				email: user?.email ?? "—",
				role: (member as { role?: string }).role ?? "member",
			};
		});
	}, [orgQuery.data?.members]);

	function addTrial(event: React.FormEvent) {
		event.preventDefault();
		if (!label.trim()) return;
		setTrials((current) => [
			...current,
			{
				id: `trial_${Date.now()}`,
				label: label.trim(),
				url: `/share/${agentId}/${Date.now()}`,
				enabled: true,
			},
		]);
		setLabel("");
		toast.message("Trial link created locally (mocked until API exists)");
	}

	return (
		<div className="space-y-6">
			<Card className="rounded-3xl border shadow-sm ring-1 ring-black/5">
				<CardHeader>
					<CardTitle>Organization access</CardTitle>
					<CardDescription>
						Members of this workspace who can use the agent.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
						<div>
							<p className="text-sm font-medium">
								Allow all org members
							</p>
							<p className="text-xs text-muted-foreground">
								Mock toggle — persisted access API not wired
								yet.
							</p>
						</div>
						<Switch
							checked={orgAccessEnabled}
							onCheckedChange={(checked) => {
								setOrgAccessEnabled(checked);
								toast.message("Access update mocked");
							}}
						/>
					</div>

					{orgQuery.isPending ? (
						<LoadingState />
					) : members.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No organization members found.
						</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Member</TableHead>
										<TableHead>Role</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{members.map((member) => (
										<TableRow key={member.id}>
											<TableCell>
												<p className="font-medium">
													{member.name}
												</p>
												<p className="text-xs text-muted-foreground">
													{member.email}
												</p>
											</TableCell>
											<TableCell className="capitalize">
												{member.role}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="rounded-3xl border shadow-sm ring-1 ring-black/5">
				<CardHeader>
					<CardTitle>Trial links</CardTitle>
					<CardDescription>
						Shareable demo links (mocked locally).
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<form
						onSubmit={addTrial}
						className="flex flex-col gap-3 sm:flex-row sm:items-end"
					>
						<div className="min-w-0 flex-1 space-y-2">
							<Label htmlFor="trial-label">Label</Label>
							<Input
								id="trial-label"
								value={label}
								onChange={(event) =>
									setLabel(event.target.value)
								}
								placeholder="Sales demo"
							/>
						</div>
						<Button type="submit" disabled={!label.trim()}>
							Create link
						</Button>
					</form>

					{trials.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No trial links yet.
						</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Label</TableHead>
										<TableHead>URL</TableHead>
										<TableHead>Enabled</TableHead>
										<TableHead className="text-right">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{trials.map((trial) => (
										<TableRow key={trial.id}>
											<TableCell className="font-medium">
												{trial.label}
											</TableCell>
											<TableCell className="font-mono text-xs">
												{trial.url}
											</TableCell>
											<TableCell>
												{trial.enabled ? "Yes" : "No"}
											</TableCell>
											<TableCell className="text-right">
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => {
														setTrials((current) =>
															current.filter(
																(item) =>
																	item.id !==
																	trial.id,
															),
														);
														toast.message(
															"Trial link removed (mock)",
														);
													}}
												>
													Remove
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
