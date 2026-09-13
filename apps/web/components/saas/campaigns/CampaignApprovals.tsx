"use client";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	MasterDetailEmpty,
	MasterDetailLayout,
	MasterDetailListItem,
	MasterDetailSectionLabel,
} from "./MasterDetailLayout";

const DECISION_OPTIONS = [
	{ value: "ALL", label: "All statuses" },
	{ value: "PENDING", label: "Pending" },
	{ value: "APPROVED", label: "Approved" },
	{ value: "REJECTED", label: "Rejected" },
	{ value: "EXPIRED", label: "Expired" },
] as const;

type DecisionFilter = (typeof DECISION_OPTIONS)[number]["value"];

const COMPLETED_DECISIONS = new Set(["APPROVED", "REJECTED", "EXPIRED"]);

export function CampaignApprovals({ campaignId }: { campaignId: string }) {
	const queryClient = useQueryClient();
	const [decision, setDecision] = useState<DecisionFilter>("PENDING");
	const [selectedToken, setSelectedToken] = useState<string | null>(null);

	const approvalsQuery = useQuery({
		...orpc.workflows.listApprovals.queryOptions({
			input: {
				campaignId,
				decision: decision === "ALL" ? undefined : decision,
				limit: 50,
			},
		}),
		refetchInterval:
			decision === "PENDING" || decision === "ALL" ? 5000 : false,
	});

	const decide = useMutation(
		orpc.workflows.decideApproval.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.workflows.listApprovals.key({
						input: { campaignId },
					}),
				});
				toast.success("Decision recorded");
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const approvals = approvalsQuery.data?.approvals ?? [];

	const { active, completed } = useMemo(() => {
		if (decision !== "ALL") {
			return { active: approvals, completed: [] as typeof approvals };
		}
		return {
			active: approvals.filter((a) => a.decision === "PENDING"),
			completed: approvals.filter((a) =>
				COMPLETED_DECISIONS.has(a.decision),
			),
		};
	}, [approvals, decision]);

	const selected = approvals.find((a) => a.token === selectedToken) ?? null;

	const clearSelection = () => setSelectedToken(null);

	const handleStatusChange = (value: string) => {
		setDecision(value as DecisionFilter);
		clearSelection();
	};

	const listIsEmpty = !approvalsQuery.isPending && approvals.length === 0;

	return (
		<MasterDetailLayout
			hasSelection={!!selected}
			onBack={clearSelection}
			statusValue={decision}
			onStatusChange={handleStatusChange}
			statusOptions={[...DECISION_OPTIONS]}
			listLoading={approvalsQuery.isPending}
			listEmpty={
				listIsEmpty ? (
					<MasterDetailEmpty
						title="No approvals"
						description={
							decision === "ALL"
								? "Approvals will appear here when a workflow needs a decision."
								: `No approvals with status ${decision}.`
						}
						className="min-h-48 p-4"
					/>
				) : undefined
			}
			listContent={
				<div className="space-y-1">
					{active.map((approval) => (
						<MasterDetailListItem
							key={approval.token}
							selected={selectedToken === approval.token}
							onClick={() => setSelectedToken(approval.token)}
						>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">
									{approval.decision}
								</Badge>
								<span className="text-xs text-muted-foreground">
									{approval.nodeType}
								</span>
							</div>
							<p className="line-clamp-2 text-sm">
								{approval.message ?? "Approval required"}
							</p>
							<p className="text-[11px] text-muted-foreground">
								Run {approval.runId.slice(0, 8)}… ·{" "}
								{new Date(approval.createdAt).toLocaleString()}
							</p>
						</MasterDetailListItem>
					))}

					{completed.length > 0 ? (
						<>
							<MasterDetailSectionLabel>
								Completed
							</MasterDetailSectionLabel>
							{completed.map((approval) => (
								<MasterDetailListItem
									key={approval.token}
									selected={selectedToken === approval.token}
									onClick={() =>
										setSelectedToken(approval.token)
									}
								>
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant="outline">
											{approval.decision}
										</Badge>
										<span className="text-xs text-muted-foreground">
											{approval.nodeType}
										</span>
									</div>
									<p className="line-clamp-2 text-sm">
										{approval.message ??
											"Approval required"}
									</p>
									<p className="text-[11px] text-muted-foreground">
										Run {approval.runId.slice(0, 8)}… ·{" "}
										{new Date(
											approval.createdAt,
										).toLocaleString()}
									</p>
								</MasterDetailListItem>
							))}
						</>
					) : null}
				</div>
			}
			detailTitle={
				selected ? (
					<span className="truncate">
						{selected.message ?? "Approval required"}
					</span>
				) : null
			}
			detailActions={
				selected ? (
					<>
						{selected.decision === "PENDING" ? (
							<>
								<Button
									size="sm"
									disabled={decide.isPending}
									onClick={() =>
										decide.mutate({
											token: selected.token,
											decision: "APPROVED",
										})
									}
								>
									Approve
								</Button>
								<Button
									size="sm"
									variant="destructive"
									disabled={decide.isPending}
									onClick={() =>
										decide.mutate({
											token: selected.token,
											decision: "REJECTED",
										})
									}
								>
									Reject
								</Button>
							</>
						) : null}
						<Button asChild size="sm" variant="outline">
							<Link
								href={`/app/campaigns/${campaignId}/approvals/${selected.token}`}
							>
								Open
							</Link>
						</Button>
					</>
				) : null
			}
			detailEmpty={{
				title: "Nothing Here",
				description: "Select an approval to preview.",
			}}
			detailContent={
				selected ? (
					<div className="space-y-4 p-4 sm:p-6">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">{selected.decision}</Badge>
							<span className="text-xs text-muted-foreground">
								{selected.nodeType} · {selected.nodeId}
							</span>
						</div>
						<p className="text-sm">
							{selected.message ?? "Approval required"}
						</p>
						<dl className="grid gap-2 text-sm sm:grid-cols-2">
							<div>
								<dt className="text-xs text-muted-foreground">
									Run
								</dt>
								<dd className="font-mono text-xs">
									{selected.runId}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-muted-foreground">
									Channel
								</dt>
								<dd>{selected.channel}</dd>
							</div>
							<div>
								<dt className="text-xs text-muted-foreground">
									Created
								</dt>
								<dd>
									{new Date(
										selected.createdAt,
									).toLocaleString()}
								</dd>
							</div>
							{selected.expiresAt ? (
								<div>
									<dt className="text-xs text-muted-foreground">
										Expires
									</dt>
									<dd>
										{new Date(
											selected.expiresAt,
										).toLocaleString()}
									</dd>
								</div>
							) : null}
							{selected.decidedAt ? (
								<div>
									<dt className="text-xs text-muted-foreground">
										Decided
									</dt>
									<dd>
										{new Date(
											selected.decidedAt,
										).toLocaleString()}
									</dd>
								</div>
							) : null}
						</dl>
					</div>
				) : null
			}
		/>
	);
}
