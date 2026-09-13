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

const STATUS_OPTIONS = [
	{ value: "ALL", label: "All statuses" },
	{ value: "PENDING", label: "Pending" },
	{ value: "RUNNING", label: "Running" },
	{ value: "WAITING", label: "Waiting" },
	{ value: "SUCCEEDED", label: "Succeeded" },
	{ value: "FAILED", label: "Failed" },
	{ value: "CANCELLED", label: "Cancelled" },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

const ACTIVE_STATUSES = new Set(["PENDING", "RUNNING", "WAITING"]);
const COMPLETED_STATUSES = new Set(["SUCCEEDED", "FAILED", "CANCELLED"]);

export function CampaignWorkflowLogs({ campaignId }: { campaignId: string }) {
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<StatusFilter>("ALL");
	const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

	const runsQuery = useQuery(
		orpc.workflows.listRuns.queryOptions({
			input: {
				campaignId,
				status: status === "ALL" ? undefined : status,
				limit: 50,
			},
		}),
	);

	const runQuery = useQuery({
		...orpc.workflows.getRun.queryOptions({
			input: { id: selectedRunId ?? "" },
		}),
		enabled: !!selectedRunId,
		refetchInterval: (q) => {
			const s = q.state.data?.run?.status;
			return s === "RUNNING" || s === "PENDING" || s === "WAITING"
				? 3000
				: false;
		},
	});

	const cancelMutation = useMutation(
		orpc.workflows.cancelRun.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.workflows.listRuns.key({
						input: { campaignId },
					}),
				});
				if (selectedRunId) {
					await queryClient.invalidateQueries({
						queryKey: orpc.workflows.getRun.key({
							input: { id: selectedRunId },
						}),
					});
				}
				toast.success("Run cancelled");
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const runs = runsQuery.data?.runs ?? [];
	const run = runQuery.data?.run;

	const { active, completed } = useMemo(() => {
		if (status !== "ALL") {
			return { active: runs, completed: [] as typeof runs };
		}
		return {
			active: runs.filter((r) => ACTIVE_STATUSES.has(r.status)),
			completed: runs.filter((r) => COMPLETED_STATUSES.has(r.status)),
		};
	}, [runs, status]);

	const agentSessionId = useMemo(() => {
		if (!run?.steps) {
			return null;
		}
		for (const step of run.steps) {
			if (step.nodeType === "ai.agent") {
				const out = step.output as { sessionId?: string } | null;
				if (out?.sessionId) {
					return out.sessionId;
				}
			}
		}
		return null;
	}, [run]);

	const clearSelection = () => setSelectedRunId(null);

	const handleStatusChange = (value: string) => {
		setStatus(value as StatusFilter);
		clearSelection();
	};

	const hasSelection = !!selectedRunId;
	const listIsEmpty = !runsQuery.isPending && runs.length === 0;

	return (
		<MasterDetailLayout
			hasSelection={hasSelection}
			onBack={clearSelection}
			statusValue={status}
			onStatusChange={handleStatusChange}
			statusOptions={[...STATUS_OPTIONS]}
			listLoading={runsQuery.isPending}
			listEmpty={
				listIsEmpty ? (
					<MasterDetailEmpty
						title="No runs"
						description={
							status === "ALL"
								? "Workflow runs will appear here once this campaign executes."
								: `No runs with status ${status}.`
						}
						className="min-h-48 p-4"
					/>
				) : undefined
			}
			listContent={
				<div className="space-y-1">
					{active.map((r) => (
						<MasterDetailListItem
							key={r.id}
							selected={selectedRunId === r.id}
							onClick={() => setSelectedRunId(r.id)}
						>
							<div className="flex items-center justify-between gap-2">
								<span className="truncate font-mono text-xs">
									{r.id}
								</span>
								<Badge variant="secondary">{r.status}</Badge>
							</div>
							<div className="text-[11px] text-muted-foreground">
								{r.triggerType} ·{" "}
								{new Date(r.createdAt).toLocaleString()}
							</div>
						</MasterDetailListItem>
					))}

					{completed.length > 0 ? (
						<>
							<MasterDetailSectionLabel>
								Completed
							</MasterDetailSectionLabel>
							{completed.map((r) => (
								<MasterDetailListItem
									key={r.id}
									selected={selectedRunId === r.id}
									onClick={() => setSelectedRunId(r.id)}
								>
									<div className="flex items-center justify-between gap-2">
										<span className="truncate font-mono text-xs">
											{r.id}
										</span>
										<Badge variant="secondary">
											{r.status}
										</Badge>
									</div>
									<div className="text-[11px] text-muted-foreground">
										{r.triggerType} ·{" "}
										{new Date(r.createdAt).toLocaleString()}
									</div>
								</MasterDetailListItem>
							))}
						</>
					) : null}
				</div>
			}
			detailTitle={
				run ? (
					<span className="truncate font-mono text-xs sm:text-sm">
						{run.id}
					</span>
				) : selectedRunId ? (
					<span className="truncate font-mono text-xs sm:text-sm">
						{selectedRunId}
					</span>
				) : null
			}
			detailActions={
				run ? (
					<>
						{agentSessionId && run.campaign?.agentId ? (
							<Button asChild size="sm" variant="outline">
								<Link
									href={`/app/agents/${run.campaign.agentId}/session/${agentSessionId}`}
								>
									Open session
								</Link>
							</Button>
						) : null}
						{run.status === "RUNNING" ||
						run.status === "WAITING" ||
						run.status === "PENDING" ? (
							<Button
								size="sm"
								variant="destructive"
								onClick={() =>
									cancelMutation.mutate({ id: run.id })
								}
							>
								Cancel
							</Button>
						) : null}
					</>
				) : null
			}
			detailEmpty={{
				title: "Nothing Here",
				description: "Select a run to preview its timeline.",
			}}
			detailContent={
				runQuery.isPending && !run ? (
					<p className="p-4 text-sm text-muted-foreground sm:p-6">
						Loading…
					</p>
				) : run ? (
					<div className="space-y-4 p-4 sm:p-6">
						<p className="text-xs text-muted-foreground">
							{run.triggerType} · {run.status}
							{run.error ? ` · ${run.error}` : ""}
						</p>

						{run.steps.length === 0 ? (
							<MasterDetailEmpty
								title="No steps yet"
								description="Step timeline will appear as this run progresses."
								className="min-h-40"
							/>
						) : (
							<ol className="space-y-2">
								{run.steps.map((step) => (
									<li
										key={step.id}
										className="rounded-lg border px-3 py-2 text-sm"
									>
										<div className="flex items-center justify-between gap-2">
											<div>
												<span className="font-medium">
													{step.nodeType}
												</span>
												<span className="ml-2 font-mono text-xs text-muted-foreground">
													{step.nodeId}
												</span>
											</div>
											<Badge variant="outline">
												{step.status}
											</Badge>
										</div>
										{step.error ? (
											<p className="mt-1 text-xs text-destructive">
												{step.error}
											</p>
										) : null}
										{step.output &&
										Object.keys(step.output as object)
											.length > 0 ? (
											<pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/50 p-2 text-[10px]">
												{JSON.stringify(
													step.output,
													null,
													2,
												)}
											</pre>
										) : null}
										{step.nodeType === "ai.agent" &&
										(
											step.output as {
												sessionId?: string;
											}
										)?.sessionId &&
										run.campaign?.agentId ? (
											<Link
												className="mt-2 inline-block text-xs text-primary underline"
												href={`/app/agents/${run.campaign.agentId}/logs/${(step.output as { sessionId: string }).sessionId}`}
											>
												View agent session
											</Link>
										) : null}
									</li>
								))}
							</ol>
						)}
					</div>
				) : (
					<MasterDetailEmpty
						title="Run unavailable"
						description="This run could not be loaded."
					/>
				)
			}
		/>
	);
}
