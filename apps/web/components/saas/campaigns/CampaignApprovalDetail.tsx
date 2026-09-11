"use client";

import { Button } from "@repo/ui/button";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

export function CampaignApprovalDetail({
	campaignId,
	token,
}: {
	campaignId: string;
	token: string;
}) {
	const queryClient = useQueryClient();

	const query = useQuery(
		orpc.workflows.getApproval.queryOptions({
			input: { token },
		}),
	);

	const decide = useMutation(
		orpc.workflows.decideApproval.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.workflows.getApproval.key({
						input: { token },
					}),
				});
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

	const approval = query.data?.approval;

	return (
		<div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-6">
			<div className="flex items-center justify-between gap-2">
				<h1 className="text-2xl font-semibold">Workflow approval</h1>
				<Button asChild variant="ghost" size="sm">
					<Link href={`/app/campaigns/${campaignId}/approvals`}>
						All approvals
					</Link>
				</Button>
			</div>
			{query.isPending && (
				<p className="text-muted-foreground">Loading…</p>
			)}
			{approval && (
				<>
					<p className="text-sm text-muted-foreground">
						{approval.message}
					</p>
					<p className="text-sm">
						Status: <strong>{approval.decision}</strong>
					</p>
					{approval.decision === "PENDING" && (
						<div className="flex gap-2">
							<Button
								onClick={() =>
									decide.mutate({
										token,
										decision: "APPROVED",
									})
								}
							>
								Approve
							</Button>
							<Button
								variant="destructive"
								onClick={() =>
									decide.mutate({
										token,
										decision: "REJECTED",
									})
								}
							>
								Reject
							</Button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
