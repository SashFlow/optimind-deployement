"use client";

import { Button } from "@repo/ui/button";
import { useSession } from "@saas/auth/hooks/use-session";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import {
	ActivityIcon,
	CheckCircle2Icon,
	ClockIcon,
	PhoneIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import { ActivityChartCard } from "@/components/saas/app/dashboard/ActivityChartCard";
import { ChannelBreakdownCard } from "@/components/saas/app/dashboard/ChannelBreakdownCard";
import { DashboardAnalyticsSections } from "@/components/saas/app/dashboard/DashboardAnalyticsSections";
import {
	computeDeltaPct,
	StatCard,
} from "@/components/saas/app/dashboard/StatCard";
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
	const analyticsQuery = useDashboardAnalyticsQuery(organizationId, 7);
	const sparkline = stats.daily.map((d) => ({ value: d.count }));
	const deltaPct = computeDeltaPct(stats.daily.map((d) => d.count));
	const failurePct =
		stats.failure_rate != null
			? `${(stats.failure_rate * 100).toFixed(1)}%`
			: "—";

	return (
		<section className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Welcome Back!
					</h1>
					<p className="text-sm text-muted-foreground">
						Here&apos;s what&apos;s happening across {orgName}.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						asChild
						className="rounded-full border-border/60 bg-white/80 shadow-xs"
					>
						<Link href="#analytics">Full analytics</Link>
					</Button>
					<Button asChild className="rounded-full">
						<Link href="/app/agents">Review sessions</Link>
					</Button>
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
					description={`Failure rate ${failurePct}`}
					sparkline={sparkline}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-3">
				<div className="xl:col-span-2">
					<ActivityChartCard daily={stats.daily} />
				</div>
				<ChannelBreakdownCard byChannel={stats.by_channel} />
			</div>

			<div id="analytics" className="space-y-3 scroll-mt-6">
				<div>
					<h2 className="text-lg font-semibold tracking-tight">
						Usage analytics
					</h2>
					<p className="text-sm text-muted-foreground">
						LiveKit Cloud metrics (up to 7 days) and org telephony /
						egress
					</p>
				</div>
				{analyticsQuery.isLoading ? (
					<LoadingState className="p-0" />
				) : analyticsQuery.isError ? (
					<p className="text-sm text-destructive" role="alert">
						Unable to load analytics.
					</p>
				) : analyticsQuery.data ? (
					<DashboardAnalyticsSections
						analytics={analyticsQuery.data}
					/>
				) : null}
			</div>
		</section>
	);
}

export function Dashboard() {
	const router = useRouter();
	const { session } = useSession();
	const { activeOrganization } = useActiveOrganization();
	const statsQuery = useDashboardStatsQuery(activeOrganization?.id, 30);

	if (!session) {
		return (
			<section className="mx-auto max-w-5xl px-4 py-10">
				<LoadingState className="p-0" size="lg" />
			</section>
		);
	}

	if (statsQuery.isLoading || !statsQuery.data) {
		return (
			<section className="mx-auto max-w-5xl px-4 py-10">
				<LoadingState className="p-0" size="lg" />
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

	if (!activeOrganization?.id) {
		return (
			<section className="mx-auto max-w-5xl px-4 py-10">
				<p className="text-muted-foreground">
					Select an organization to continue.
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
