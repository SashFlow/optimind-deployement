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
import {
	ActivityIcon,
	CheckCircle2Icon,
	PhoneIcon,
	UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ChannelBreakdownCard } from "@/components/saas/app/dashboard/ChannelBreakdownCard";
import { GaugeBreakdownCard } from "@/components/saas/app/dashboard/GaugeBreakdownCard";
import { MetricKpiCard } from "@/components/saas/app/dashboard/MetricKpiCard";
import { StatCard } from "@/components/saas/app/dashboard/StatCard";
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
	const contactCount =
		funnel?.total_contacts ?? campaign?._count?.contacts ?? 0;
	const sessionCount =
		analytics?.totals.sessions ?? campaign?._count?.sessions ?? 0;
	const completionRate = funnel?.completion_rate ?? null;
	const activeNow = concurrency?.active_now ?? 0;
	const maxConcurrency = concurrency?.max;

	return (
		<div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-6 overflow-y-auto pb-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
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

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<MetricKpiCard
					title="Contacts"
					value={String(contactCount)}
					icon={UsersIcon}
					detail="In this campaign"
				/>
				<MetricKpiCard
					title="Sessions"
					value={String(sessionCount)}
					icon={PhoneIcon}
					detail="All time"
				/>
				<StatCard
					title="Completion rate"
					subtitle="Contact funnel"
					value={
						completionRate != null
							? `${(completionRate * 100).toFixed(1)}%`
							: "—"
					}
					variant="donut"
					color="var(--chart-1)"
					progress={completionRate ?? 0}
					donutLabel={
						completionRate != null
							? `${(completionRate * 100).toFixed(0)}%`
							: "—"
					}
					donutCaption="Complete"
				/>
				<MetricKpiCard
					title="Concurrency"
					value={`${activeNow}/${maxConcurrency ?? "—"}`}
					icon={ActivityIcon}
					detail="Active / max"
					progress={
						maxConcurrency && maxConcurrency > 0
							? Math.min(1, activeNow / maxConcurrency)
							: null
					}
				/>
			</div>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">Operations</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<MetricKpiCard
						title="Avg attempts"
						value={
							funnel?.avg_attempts != null
								? funnel.avg_attempts.toFixed(2)
								: "—"
						}
						icon={PhoneIcon}
					/>
					<MetricKpiCard
						title="Consent rate"
						value={
							funnel?.consent_rate != null
								? `${(funnel.consent_rate * 100).toFixed(1)}%`
								: "—"
						}
						icon={CheckCircle2Icon}
					/>
					<MetricKpiCard
						title="DNC"
						value={String(funnel?.dnc_count ?? 0)}
						icon={UsersIcon}
					/>
					<MetricKpiCard
						title="Callbacks"
						value={String(
							Object.values(analytics?.callbacks ?? {}).reduce(
								(sum, n) => sum + n,
								0,
							),
						)}
						icon={ActivityIcon}
					/>
				</div>
				<div className="grid gap-4 lg:grid-cols-2">
					<ChannelBreakdownCard
						title="Contact funnel"
						hint="Contacts by status"
						byChannel={funnel?.by_status ?? {}}
						centerLabel="Contacts"
					/>
					<GaugeBreakdownCard
						title="Outcomes"
						hint="Session outcome mix"
						items={analytics?.outcomes ?? {}}
						centerLabel="Sessions"
					/>
				</div>
			</section>

			{(Object.keys(analytics?.callbacks ?? {}).length > 0 ||
				(analytics?.access_links?.length ?? 0) > 0) && (
				<section className="space-y-3">
					<h3 className="text-base font-semibold">
						Callbacks &amp; access
					</h3>
					<div className="flex flex-wrap gap-2">
						{Object.entries(analytics?.callbacks ?? {}).map(
							([status, count]) => (
								<Badge key={status} variant="secondary">
									{status}: {count}
								</Badge>
							),
						)}
					</div>
					{(analytics?.access_links?.length ?? 0) > 0 ? (
						<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
										className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-3 py-2 text-sm shadow-xs"
									>
										<span>{link.label || link.kind}</span>
										<span className="font-semibold tabular-nums">
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
				</section>
			)}

			<Card className="shadow-xs">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base font-bold leading-none">
						Recent runs
					</CardTitle>
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
							className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm"
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
