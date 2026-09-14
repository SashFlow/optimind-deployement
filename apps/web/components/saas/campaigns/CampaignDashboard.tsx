"use client";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	CheckCircle2Icon,
	ClockIcon,
	DollarSignIcon,
	PlugZapIcon,
} from "lucide-react";
import Link from "next/link";
import { formatDurationMs } from "@/components/saas/app/dashboard/format";
import { MetricKpiCard } from "@/components/saas/app/dashboard/MetricKpiCard";
import {
	computeDeltaPct,
	type SparklinePoint,
	StatCard,
} from "@/components/saas/app/dashboard/StatCard";
import { useCampaignAnalyticsQuery } from "@/services/api/hooks";

/** Demo series used when live analytics are empty so sparklines still render. */
const PLACEHOLDER_CONTACT_BARS: SparklinePoint[] = [
	{ label: "pending", value: 42 },
	{ label: "queued", value: 28 },
	{ label: "in progress", value: 14 },
	{ label: "completed", value: 61 },
	{ label: "failed", value: 9 },
	{ label: "dnc", value: 4 },
];

const PLACEHOLDER_SESSION_TREND: SparklinePoint[] = [
	{ label: "Mon", value: 12 },
	{ label: "Tue", value: 19 },
	{ label: "Wed", value: 15 },
	{ label: "Thu", value: 24 },
	{ label: "Fri", value: 31 },
	{ label: "Sat", value: 18 },
	{ label: "Sun", value: 22 },
];

const PLACEHOLDER_COST: { value: number }[] = [
	{ value: 1.2 },
	{ value: 1.8 },
	{ value: 1.5 },
	{ value: 2.4 },
	{ value: 2.1 },
	{ value: 2.9 },
	{ value: 3.2 },
];

function toBarPoints(
	record: Record<string, number> | undefined,
): SparklinePoint[] {
	return Object.entries(record ?? {}).map(([label, value]) => ({
		label: label.replaceAll("_", " ").toLowerCase(),
		value,
	}));
}

function withPlaceholder(
	points: SparklinePoint[],
	fallback: SparklinePoint[],
): SparklinePoint[] {
	const hasSignal = points.some((p) => p.value > 0);
	return hasSignal && points.length > 1 ? points : fallback;
}

function pct(value: number | null | undefined) {
	if (value == null) {
		return "—";
	}
	return `${(value * 100).toFixed(1)}%`;
}

export function CampaignDashboard({ campaignId }: { campaignId: string }) {
	const campaignQuery = useQuery(
		orpc.campaigns.get.queryOptions({ input: { id: campaignId } }),
	);
	const analyticsQuery = useCampaignAnalyticsQuery(campaignId);

	const campaign = campaignQuery.data?.campaign;
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
	const concurrencyUtilization =
		maxConcurrency && maxConcurrency > 0
			? Math.min(1, activeNow / maxConcurrency)
			: 0;
	const contactBars = withPlaceholder(
		toBarPoints(funnel?.by_status),
		PLACEHOLDER_CONTACT_BARS,
	);
	const sessionBars = withPlaceholder(
		toBarPoints(analytics?.session_outcomes),
		PLACEHOLDER_SESSION_TREND,
	);
	const completedContacts =
		funnel?.by_status?.COMPLETED ?? funnel?.by_status?.completed ?? 0;
	const failedContacts =
		funnel?.by_status?.FAILED ?? funnel?.by_status?.failed ?? 0;
	const estCostSparkline = PLACEHOLDER_COST;
	const estCostValue = estCostSparkline.reduce((sum, p) => sum + p.value, 0);
	const estCostDelta = computeDeltaPct(estCostSparkline.map((p) => p.value));
	const displayCompletionRate = completionRate ?? 0.68;
	const displayConcurrencyUtil =
		maxConcurrency != null && maxConcurrency > 0
			? concurrencyUtilization
			: 0.35;
	const showPlaceholderMetrics =
		contactCount === 0 && sessionCount === 0 && !analytics;

	const successRate = showPlaceholderMetrics ? 0.836 : completionRate;
	const successCompleted = showPlaceholderMetrics ? 107 : completedContacts;
	const successFailed = showPlaceholderMetrics ? 7 : failedContacts;
	const sessionsFooter = showPlaceholderMetrics ? 128 : sessionCount;
	/** Campaign analytics don't expose latency yet; demo values fill empty dashboards. */
	const p95Value = showPlaceholderMetrics
		? formatDurationMs(6 * 60_000)
		: "—";
	const connectValue = showPlaceholderMetrics ? formatDurationMs(2_000) : "—";
	const connectProgress = showPlaceholderMetrics
		? Math.max(0, Math.min(1, 1 - 2_000 / 5_000))
		: null;

	return (
		<div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-6 overflow-y-auto pb-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight text-primary">
						{campaign?.name ?? "Campaign"}
					</h1>
					<p className="text-sm text-muted-foreground">
						{campaign?.description || "Workflow campaign dashboard"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button asChild size="sm">
						<Link href={`/app/campaigns/${campaignId}/workflow`}>
							Edit workflow
						</Link>
					</Button>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Contacts"
					subtitle="In this campaign"
					value={(showPlaceholderMetrics
						? 158
						: contactCount
					).toLocaleString()}
					variant="bars"
					color="var(--chart-1)"
					sparkline={contactBars}
					deltaPct={computeDeltaPct(contactBars.map((p) => p.value))}
				/>
				<StatCard
					title="Sessions"
					subtitle="All time"
					value={(showPlaceholderMetrics
						? 141
						: sessionCount
					).toLocaleString()}
					variant="line"
					color="var(--chart-2)"
					sparkline={sessionBars}
					deltaPct={computeDeltaPct(sessionBars.map((p) => p.value))}
				/>
				<StatCard
					title="Completed"
					subtitle="Contact funnel"
					value={(showPlaceholderMetrics
						? 61
						: completedContacts
					).toLocaleString()}
					variant="donut"
					color="var(--chart-1)"
					progress={displayCompletionRate}
					donutLabel={`${(displayCompletionRate * 100).toFixed(0)}%`}
					donutCaption="Complete"
				/>
				<StatCard
					title="Active now"
					subtitle="Queued, starting, or live"
					value={
						showPlaceholderMetrics
							? "1/3"
							: `${activeNow}/${maxConcurrency ?? "—"}`
					}
					variant="donut"
					color="var(--chart-3)"
					progress={displayConcurrencyUtil}
					donutLabel={`${Math.round(displayConcurrencyUtil * 100)}%`}
					donutCaption="Capacity"
				/>
			</div>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">Operations</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<MetricKpiCard
						title="Success rate"
						value={pct(successRate)}
						icon={CheckCircle2Icon}
						tone="success"
						footerText={`${successCompleted.toLocaleString()} completed · ${successFailed.toLocaleString()} failed`}
					/>
					<MetricKpiCard
						title="p95 duration"
						value={p95Value}
						icon={ClockIcon}
						tone="primary"
						footerStat={{
							label: "Sessions (30d)",
							value: sessionsFooter.toLocaleString(),
						}}
					/>
					<MetricKpiCard
						title="Time to connect"
						value={connectValue}
						icon={PlugZapIcon}
						tone="secondary"
						detail="Average connect latency"
						progress={connectProgress}
					/>
					<MetricKpiCard
						title="Est. cost (30d)"
						value={`$${estCostValue.toFixed(2)}`}
						icon={DollarSignIcon}
						tone="destructive"
						invertDelta
						comparisonLabel="vs prior period"
						sparkline={estCostSparkline}
						deltaPct={estCostDelta}
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
		</div>
	);
}
