"use client";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@repo/ui/collapsible";
import {
	ActivityIcon,
	CheckCircle2Icon,
	ChevronDownIcon,
	ClockIcon,
	PhoneIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ActivityChartCard } from "@/components/saas/app/dashboard/ActivityChartCard";
import { ChannelBreakdownCard } from "@/components/saas/app/dashboard/ChannelBreakdownCard";
import { DashboardAnalyticsSections } from "@/components/saas/app/dashboard/DashboardAnalyticsSections";
import { DashboardExtendedSections } from "@/components/saas/app/dashboard/DashboardExtendedSections";
import {
	computeDeltaPct,
	StatCard,
} from "@/components/saas/app/dashboard/StatCard";
import {
	ChartCardSkeleton,
	PageSectionSkeleton,
} from "@/components/saas/shared/skeletons";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { useSession } from "@/context/SessionProvider";
import {
	useDashboardAnalyticsQuery,
	useDashboardStatsQuery,
} from "@/services/api/hooks";
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
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const analyticsQuery = useDashboardAnalyticsQuery(organizationId, 7, {
		enabled: advancedOpen,
	});
	const sparkline = stats.daily.map((d) => ({ value: d.count }));
	const deltaPct = computeDeltaPct(stats.daily.map((d) => d.count));
	const failurePct =
		stats.failure_rate != null
			? `${(stats.failure_rate * 100).toFixed(1)}%`
			: "—";

	useEffect(() => {
		const syncFromHash = () => {
			if (window.location.hash === "#analytics") {
				setAdvancedOpen(true);
			}
		};
		syncFromHash();
		window.addEventListener("hashchange", syncFromHash);
		return () => window.removeEventListener("hashchange", syncFromHash);
	}, []);

	return (
		<section className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-6">
			<div className="flex flex-col gap-4">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Welcome Back!
					</h1>
					<p className="text-sm text-muted-foreground">
						Here&apos;s what&apos;s happening across {orgName}.
					</p>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Total sessions"
					value={stats.total_sessions.toLocaleString()}
					icon={PhoneIcon}
					sparkline={sparkline}
					deltaPct={deltaPct}
				/>
				<StatCard
					title="Active now"
					value={stats.active_sessions.toLocaleString()}
					icon={ActivityIcon}
					description="Queued, starting, or live"
					sparkline={sparkline}
				/>
				<StatCard
					title="Completed"
					value={stats.completed_sessions.toLocaleString()}
					icon={CheckCircle2Icon}
					sparkline={stats.daily.map((d) => ({ value: d.completed }))}
					deltaPct={computeDeltaPct(
						stats.daily.map((d) => d.completed),
					)}
				/>
				<StatCard
					title="Avg duration"
					value={formatDuration(stats.avg_duration_ms)}
					icon={ClockIcon}
					description={`Success ${stats.success_rate != null ? `${(stats.success_rate * 100).toFixed(1)}%` : "—"} · Fail ${failurePct}`}
					sparkline={sparkline}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-3">
				<div className="xl:col-span-2">
					<ActivityChartCard daily={stats.daily} />
				</div>
				<ChannelBreakdownCard byChannel={stats.by_channel} />
			</div>

			<Collapsible
				open={advancedOpen}
				onOpenChange={setAdvancedOpen}
				id="analytics"
				className="scroll-mt-6"
			>
				{!advancedOpen ? (
					<div className="flex justify-center">
						<CollapsibleTrigger className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/80 px-4 py-2 text-sm font-medium shadow-xs outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring">
							Advanced
							<ChevronDownIcon className="size-4 text-muted-foreground" />
						</CollapsibleTrigger>
					</div>
				) : null}
				<CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
					<div className="space-y-3">
						<div>
							<h2 className="text-lg font-semibold tracking-tight">
								Usage analytics
							</h2>
							<p className="text-sm text-muted-foreground">
								Operations, usage/cost, quality, actions,
								latency, telephony, and egress
							</p>
						</div>
						<DashboardExtendedSections
							organizationId={organizationId}
							stats={stats}
							enabled={advancedOpen}
						/>
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
								Unable to load telephony analytics.
							</p>
						) : analyticsQuery.data ? (
							<DashboardAnalyticsSections
								analytics={analyticsQuery.data}
							/>
						) : null}
					</div>
				</CollapsibleContent>
			</Collapsible>
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
