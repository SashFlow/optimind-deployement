"use client";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { useCampaignAnalyticsQuery } from "@/services/api/hooks";

export function CampaignDashboard({ campaignId }: { campaignId: string }) {
	const queryClient = useQueryClient();

	const campaignQuery = useQuery(
		orpc.campaigns.get.queryOptions({ input: { id: campaignId } }),
	);
	const runsQuery = useQuery(
		orpc.workflows.listRuns.queryOptions({
			input: { campaignId, limit: 8 },
		}),
	);
	const analyticsQuery = useCampaignAnalyticsQuery(campaignId);

	const updateMutation = useMutation(
		orpc.campaigns.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.campaigns.get.key({
						input: { id: campaignId },
					}),
				});
				toast.success("Campaign updated");
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const tickMutation = useMutation(
		orpc.workflows.tickRunner.mutationOptions({
			onSuccess: async (data) => {
				await queryClient.invalidateQueries({
					queryKey: orpc.workflows.listRuns.key({
						input: { campaignId },
					}),
				});
				toast.success(
					`Runner tick: ${data.processed} runs, ${data.resumed} waits, ${data.scheduled ?? 0} scheduled`,
				);
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const campaign = campaignQuery.data?.campaign;
	const runs = runsQuery.data?.runs ?? [];
	const analytics = analyticsQuery.data;
	const funnel = analytics?.funnel;
	const concurrency = analytics?.concurrency;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold">
						{campaign?.name ?? "Campaign"}
					</h1>
					<p className="text-sm text-muted-foreground">
						{campaign?.description || "Workflow campaign dashboard"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Select
						value={campaign?.status ?? "DRAFT"}
						onValueChange={(status) =>
							updateMutation.mutate({
								id: campaignId,
								status: status as
									| "DRAFT"
									| "ACTIVE"
									| "PAUSED"
									| "COMPLETED"
									| "ARCHIVED",
							})
						}
					>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(
								[
									"DRAFT",
									"ACTIVE",
									"PAUSED",
									"COMPLETED",
									"ARCHIVED",
								] as const
							).map((s) => (
								<SelectItem key={s} value={s}>
									{s}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						variant="outline"
						size="sm"
						onClick={() => tickMutation.mutate({})}
					>
						Tick runner
					</Button>
					<Button asChild size="sm">
						<Link href={`/app/campaigns/${campaignId}/workflow`}>
							Edit workflow
						</Link>
					</Button>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Contacts"
					value={String(
						funnel?.total_contacts ??
							campaign?._count?.contacts ??
							0,
					)}
				/>
				<StatCard
					title="Sessions"
					value={String(
						analytics?.totals.sessions ??
							campaign?._count?.sessions ??
							0,
					)}
				/>
				<StatCard
					title="Completion rate"
					value={
						funnel?.completion_rate != null
							? `${(funnel.completion_rate * 100).toFixed(1)}%`
							: "—"
					}
				/>
				<StatCard
					title="Concurrency"
					value={`${concurrency?.active_now ?? 0}/${concurrency?.max ?? "—"}`}
				/>
			</div>

			<div className="grid gap-3 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Contact funnel
						</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
						{Object.entries(funnel?.by_status ?? {}).map(
							([status, count]) => (
								<div
									key={status}
									className="flex justify-between rounded-md border px-3 py-2"
								>
									<span className="text-muted-foreground">
										{status}
									</span>
									<span className="font-medium">
										{count}
									</span>
								</div>
							),
						)}
						{Object.keys(funnel?.by_status ?? {}).length === 0 ? (
							<p className="text-muted-foreground">
								No contact status data yet.
							</p>
						) : null}
						<div className="sm:col-span-2 text-xs text-muted-foreground">
							Avg attempts:{" "}
							{funnel?.avg_attempts != null
								? funnel.avg_attempts.toFixed(2)
								: "—"}{" "}
							· Consent:{" "}
							{funnel?.consent_rate != null
								? `${(funnel.consent_rate * 100).toFixed(1)}%`
								: "—"}{" "}
							· DNC: {funnel?.dnc_count ?? 0}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Outcomes &amp; callbacks
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="grid gap-2 sm:grid-cols-2">
							{Object.entries(analytics?.outcomes ?? {}).map(
								([outcome, count]) => (
									<div
										key={outcome}
										className="flex justify-between rounded-md border px-3 py-2"
									>
										<span className="truncate text-muted-foreground">
											{outcome}
										</span>
										<span className="font-medium">
											{count}
										</span>
									</div>
								),
							)}
						</div>
						<div className="flex flex-wrap gap-2">
							{Object.entries(analytics?.callbacks ?? {}).map(
								([status, count]) => (
									<Badge key={status} variant="secondary">
										{status}: {count}
									</Badge>
								),
							)}
							{Object.keys(analytics?.callbacks ?? {}).length ===
							0 ? (
								<span className="text-muted-foreground">
									No callbacks scheduled
								</span>
							) : null}
						</div>
						{(analytics?.access_links?.length ?? 0) > 0 ? (
							<div className="space-y-1">
								<div className="text-xs font-medium text-muted-foreground">
									Access links
								</div>
								{(analytics?.access_links ?? []).map(
									(link: {
										id: string;
										label: string | null;
										kind: string;
										useCount: number;
										maxUses: number | null;
									}) => (
										<div
											key={link.id}
											className="flex justify-between rounded-md border px-3 py-1.5"
										>
											<span>
												{link.label || link.kind}
											</span>
											<span>
												{link.useCount}
												{link.maxUses != null
													? `/${link.maxUses}`
													: ""}
											</span>
										</div>
									),
								)}
							</div>
						) : null}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">Recent runs</CardTitle>
					<Button asChild variant="ghost" size="sm">
						<Link href={`/app/campaigns/${campaignId}/logs`}>
							View logs
						</Link>
					</Button>
				</CardHeader>
				<CardContent className="space-y-2">
					{runs.length === 0 && (
						<p className="text-sm text-muted-foreground">
							No runs yet. Publish a workflow and trigger a test
							or webhook.
						</p>
					)}
					{runs.map((run) => (
						<div
							key={run.id}
							className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
						>
							<div className="min-w-0">
								<div className="truncate font-medium">
									{run.id}
								</div>
								<div className="text-xs text-muted-foreground">
									{run.triggerType} ·{" "}
									{new Date(run.createdAt).toLocaleString()}
									{run.workflowVersion
										? ` · v${run.workflowVersion.version}`
										: ""}
								</div>
							</div>
							<Badge variant="secondary">{run.status}</Badge>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

function StatCard({ title, value }: { title: string; value: string }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-semibold">{value}</div>
			</CardContent>
		</Card>
	);
}
