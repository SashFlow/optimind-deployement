"use client";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STATUSES = [
	"ALL",
	"PENDING",
	"RUNNING",
	"WAITING",
	"SUCCEEDED",
	"FAILED",
	"CANCELLED",
] as const;

export function CampaignWorkflowLogs({ campaignId }: { campaignId: string }) {
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
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

	const agentSessionId = useMemo(() => {
		if (!run?.steps) return null;
		for (const step of run.steps) {
			if (step.nodeType === "ai.agent") {
				const out = step.output as { sessionId?: string } | null;
				if (out?.sessionId) return out.sessionId;
			}
		}
		return null;
	}, [run]);

	return (
		<div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
			<div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border">
				<div className="flex flex-wrap gap-1 border-b p-2">
					{STATUSES.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => setStatus(s)}
							className={cn(
								"rounded-full px-2 py-0.5 text-[10px]",
								status === s
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground",
							)}
						>
							{s}
						</button>
					))}
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto">
					{runs.map((r) => (
						<button
							key={r.id}
							type="button"
							onClick={() => setSelectedRunId(r.id)}
							className={cn(
								"flex w-full flex-col gap-1 border-b px-3 py-2 text-left text-sm hover:bg-muted/40",
								selectedRunId === r.id && "bg-muted/60",
							)}
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
						</button>
					))}
					{runs.length === 0 && (
						<p className="p-3 text-sm text-muted-foreground">
							No runs
						</p>
					)}
				</div>
			</div>

			<div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-xl border p-4">
				{!run && (
					<p className="text-sm text-muted-foreground">
						Select a run to inspect step timeline.
					</p>
				)}
				{run && (
					<div className="space-y-4">
						<div className="flex flex-wrap items-start justify-between gap-2">
							<div>
								<h2 className="font-semibold">{run.id}</h2>
								<p className="text-xs text-muted-foreground">
									{run.triggerType} · {run.status}
									{run.error ? ` · ${run.error}` : ""}
								</p>
							</div>
							<div className="flex gap-2">
								{agentSessionId && run.campaign?.agentId && (
									<Button asChild size="sm" variant="outline">
										<Link
											href={`/app/agents/${run.campaign.agentId}/session/${agentSessionId}`}
										>
											Open session
										</Link>
									</Button>
								)}
								{(run.status === "RUNNING" ||
									run.status === "WAITING" ||
									run.status === "PENDING") && (
									<Button
										size="sm"
										variant="destructive"
										onClick={() =>
											cancelMutation.mutate({
												id: run.id,
											})
										}
									>
										Cancel
									</Button>
								)}
							</div>
						</div>

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
									{step.error && (
										<p className="mt-1 text-xs text-destructive">
											{step.error}
										</p>
									)}
									{step.output &&
										Object.keys(step.output as object)
											.length > 0 && (
											<pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/50 p-2 text-[10px]">
												{JSON.stringify(
													step.output,
													null,
													2,
												)}
											</pre>
										)}
									{step.nodeType === "ai.agent" &&
										(step.output as { sessionId?: string })
											?.sessionId &&
										run.campaign?.agentId && (
											<Link
												className="mt-2 inline-block text-xs text-primary underline"
												href={`/app/agents/${run.campaign.agentId}/logs/${(step.output as { sessionId: string }).sessionId}`}
											>
												View agent session
											</Link>
										)}
								</li>
							))}
						</ol>
					</div>
				)}
			</div>
		</div>
	);
}
