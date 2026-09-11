"use client";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const DECISIONS = [
	"ALL",
	"PENDING",
	"APPROVED",
	"REJECTED",
	"EXPIRED",
] as const;

export function CampaignApprovals({ campaignId }: { campaignId: string }) {
	const queryClient = useQueryClient();
	const [decision, setDecision] =
		useState<(typeof DECISIONS)[number]>("PENDING");

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

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
			<div className="flex flex-wrap gap-1 border-b p-2">
				{DECISIONS.map((d) => (
					<button
						key={d}
						type="button"
						onClick={() => setDecision(d)}
						className={cn(
							"rounded-full px-2 py-0.5 text-[10px]",
							decision === d
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground",
						)}
					>
						{d}
					</button>
				))}
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{approvalsQuery.isPending && (
					<p className="p-4 text-sm text-muted-foreground">
						Loading…
					</p>
				)}
				{!approvalsQuery.isPending && approvals.length === 0 && (
					<p className="p-4 text-sm text-muted-foreground">
						No approvals
						{decision === "ALL" ? "" : ` with status ${decision}`}.
					</p>
				)}
				<ul className="divide-y">
					{approvals.map((approval) => (
						<li
							key={approval.token}
							className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
						>
							<div className="min-w-0 space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant="outline">
										{approval.decision}
									</Badge>
									<span className="text-xs text-muted-foreground">
										{approval.nodeType} · {approval.nodeId}
									</span>
								</div>
								<p className="text-sm">
									{approval.message ?? "Approval required"}
								</p>
								<p className="text-xs text-muted-foreground">
									Run {approval.runId.slice(0, 8)}… ·{" "}
									{new Date(
										approval.createdAt,
									).toLocaleString()}
								</p>
							</div>
							<div className="flex shrink-0 flex-wrap gap-2">
								{approval.decision === "PENDING" && (
									<>
										<Button
											size="sm"
											disabled={decide.isPending}
											onClick={() =>
												decide.mutate({
													token: approval.token,
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
													token: approval.token,
													decision: "REJECTED",
												})
											}
										>
											Reject
										</Button>
									</>
								)}
								<Button asChild size="sm" variant="outline">
									<Link
										href={`/app/campaigns/${campaignId}/approvals/${approval.token}`}
									>
										Open
									</Link>
								</Button>
							</div>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
