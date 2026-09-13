"use client";

import { useEffect } from "react";
import { ActivityChartCard } from "@/components/saas/app/dashboard/ActivityChartCard";
import { ChannelBreakdownCard } from "@/components/saas/app/dashboard/ChannelBreakdownCard";
// import { DashboardExtendedSections } from "@/components/saas/app/dashboard/DashboardExtendedSections";
import { GaugeBreakdownCard } from "@/components/saas/app/dashboard/GaugeBreakdownCard";
import {
	computeDeltaPct,
	StatCard,
} from "@/components/saas/app/dashboard/StatCard";
import { PageSectionSkeleton } from "@/components/saas/shared/skeletons";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { useSession } from "@/context/SessionProvider";
import { useDashboardStatsQuery } from "@/services/api/hooks";
import type { DashboardStats } from "@/services/api/types";

function formatDuration(ms: number | null) {
	if (!ms) return "—";
	const seconds = Math.floor(ms / 1000);
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	if (mins >= 60) {
		const hours = Math.floor(mins / 60);
		const remMins = mins % 60;
		return `${hours}h ${remMins}m`;
	}
	return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function DashboardBody({
	stats,
	orgName,
	organizationId,
}: {
	stats: DashboardStats;
	orgName: string;
	organizationId: string;
}) {
	const sparkline = stats.daily.map((d) => ({
		value: d.count,
		label: d.date.slice(5),
	}));
	const completedSparkline = stats.daily.map((d) => ({
		value: d.completed,
		label: d.date.slice(5),
	}));
	const deltaPct = computeDeltaPct(stats.daily.map((d) => d.count));
	const completedDeltaPct = computeDeltaPct(
		stats.daily.map((d) => d.completed),
	);
	const completionRate =
		stats.total_sessions > 0
			? stats.completed_sessions / stats.total_sessions
			: 0;
	const completionPct = `${(completionRate * 100).toFixed(0)}%`;

	useEffect(() => {
		const syncFromHash = () => {
			if (window.location.hash === "#analytics") {
				setAnalyticsOpen(true);
			}
		};
		syncFromHash();
		window.addEventListener("hashchange", syncFromHash);
		return () => window.removeEventListener("hashchange", syncFromHash);
	}, []);

	return (
		<section className="mx-auto w-full max-w-[1600px] space-y-6">
			<div className="flex flex-col gap-4">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight text-primary">
						Welcome Back!
					</h1>
					<p className="text-sm text-muted-foreground">
						Here&apos;s what&apos;s happening across{" "}
						<span className="font-semibold text-primary">
							{orgName}
						</span>
						.
					</p>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Total sessions"
					subtitle="Last 30 days"
					value={stats.total_sessions.toLocaleString()}
					variant="line"
					color="var(--chart-1)"
					sparkline={sparkline}
					deltaPct={deltaPct}
				/>
				<StatCard
					title="Active now"
					subtitle="Queued, starting, or live"
					value={stats.active_sessions.toLocaleString()}
					variant="dotted-line"
					color="var(--chart-2)"
					sparkline={sparkline}
				/>
				<StatCard
					title="Completed"
					subtitle="Last 30 days"
					value={stats.completed_sessions.toLocaleString()}
					variant="donut"
					color="var(--chart-1)"
					progress={completionRate}
					donutLabel={completionPct}
					donutCaption="Complete"
					deltaPct={completedDeltaPct}
				/>
				<StatCard
					title="Avg duration"
					subtitle="Last 30 days"
					value={formatDuration(stats.avg_duration_ms)}
					variant="line"
					color="var(--chart-3)"
					sparkline={completedSparkline}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-3">
				<div className="xl:col-span-2">
					<ActivityChartCard daily={stats.daily} />
				</div>
				<ChannelBreakdownCard byChannel={stats.by_channel} />
			</div>
			<div className="grid gap-4 lg:grid-cols-2">
				<ChannelBreakdownCard
					title="End reasons"
					hint="How sessions ended"
					byChannel={stats.by_end_reason ?? {}}
				/>
				<GaugeBreakdownCard
					title="Direction"
					hint="Inbound / outbound / web"
					items={stats.by_direction ?? {}}
				/>
			</div>
			{/* <DashboardExtendedSections
				organizationId={organizationId}
				stats={stats}
			/> */}
			{/* TODO: Add Livekit analytics section */}
			{/* {analyticsQuery.isLoading ? (
				<div className="space-y-4">
					<ChartCardSkeleton />
					<div className="grid gap-4 lg:grid-cols-2">
						<ChartCardSkeleton height="h-48" />
						<ChartCardSkeleton height="h-48" />
					</div>
				</div>
			) : analyticsQuery.isError ? (
				<p className="text-sm text-destructive" role="alert">
					Unable to load telephony analytics.
				</p>
			) : analyticsQuery.data ? (
				<DashboardTelephonySections analytics={analyticsQuery.data} />
			) : null} */}

			{/* <Collapsible
				open={analyticsOpen}
				onOpenChange={setAnalyticsOpen}
				id="analytics"
				className="scroll-mt-6"
			>
				{!analyticsOpen ? (
					<div className="flex justify-center">
						<CollapsibleTrigger className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/80 px-4 py-2 text-sm font-medium shadow-xs outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring">
							Analytics
							<ChevronDownIcon className="size-4 text-muted-foreground" />
						</CollapsibleTrigger>
					</div>
				) : (
					<div className="flex items-center justify-between gap-3">
						<h3 className="text-base font-semibold">
							LiveKit analytics
						</h3>
						<CollapsibleTrigger className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/80 px-3 py-1.5 text-sm font-medium shadow-xs outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring">
							Hide
							<ChevronDownIcon className="size-4 rotate-180 text-muted-foreground" />
						</CollapsibleTrigger>
					</div>
				)}
				<CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
					<div className="space-y-3 pt-3">
						{analyticsQuery.isLoading ? (
							<div className="space-y-4">
								<ChartCardSkeleton />
								<div className="grid gap-4 lg:grid-cols-2">
									<ChartCardSkeleton height="h-48" />
									<ChartCardSkeleton height="h-48" />
								</div>
							</div>
						) : analyticsQuery.isError ? (
							<p
								className="text-sm text-destructive"
								role="alert"
							>
								Unable to load LiveKit analytics.
							</p>
						) : analyticsQuery.data ? (
							<DashboardLivekitAnalyticsSections
								analytics={analyticsQuery.data}
							/>
						) : null}
					</div>
				</CollapsibleContent>
			</Collapsible> */}
		</section>
	);
}

export function Dashboard() {
	const { session } = useSession();
	const { activeOrganization, loaded } = useActiveOrganization();
	const statsQuery = useDashboardStatsQuery(activeOrganization?.id, 30);

	if (!session || !loaded) {
		return (
			<section className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6">
				<PageSectionSkeleton variant="monitor" className="px-0 py-0" />
			</section>
		);
	}

	if (!activeOrganization?.id) {
		return (
			<section className="mx-auto max-w-5xl px-4 py-10">
				<p className="text-muted-foreground">
					Select an organization to continue.
				</p>
			</section>
		);
	}

	if (statsQuery.isLoading || !statsQuery.data) {
		return (
			<section className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6">
				<PageSectionSkeleton variant="monitor" className="px-0 py-0" />
			</section>
		);
	}

	if (statsQuery.isError) {
		return (
			<section className="mx-auto max-w-5xl px-4 py-10">
				<p className="text-sm text-destructive" role="alert">
					Unable to load dashboard stats.
				</p>
			</section>
		);
	}

	return (
		<DashboardBody
			stats={statsQuery.data}
			orgName={activeOrganization?.name ?? "your organization"}
			organizationId={activeOrganization?.id}
		/>
	);
}
