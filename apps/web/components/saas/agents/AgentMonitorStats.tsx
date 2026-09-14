"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
	ActivityIcon,
	CheckCircle2Icon,
	ClockIcon,
	DollarSignIcon,
	PhoneIcon,
	XCircleIcon,
} from "lucide-react";
import { useMemo } from "react";
import { ActivityChartCard } from "@/components/saas/app/dashboard/ActivityChartCard";
import { ChannelBreakdownCard } from "@/components/saas/app/dashboard/ChannelBreakdownCard";
import { formatDurationMs } from "@/components/saas/app/dashboard/format";
import { GaugeBreakdownCard } from "@/components/saas/app/dashboard/GaugeBreakdownCard";
import { MetricKpiCard } from "@/components/saas/app/dashboard/MetricKpiCard";
import {
	computeDeltaPct,
	StatCard,
} from "@/components/saas/app/dashboard/StatCard";
import {
	DataTableValuePill,
	StandardDataTable,
} from "@/components/saas/shared/StandardDataTable";
import type { AgentStats } from "./lib/types";

function pct(value: number | null | undefined) {
	if (value == null) {
		return "—";
	}
	return `${(value * 100).toFixed(1)}%`;
}

type LatencyRow = {
	metric: string;
	avg_ms: number | null;
	p95_ms: number | null;
};

type VersionRow = {
	agentVersionId: string;
	sessions: number;
	avg_duration_ms: number | null;
};

const latencyColumns: ColumnDef<LatencyRow>[] = [
	{
		accessorKey: "metric",
		header: "Metric",
		cell: ({ row }) => (
			<span className="font-medium text-foreground">
				{row.original.metric}
			</span>
		),
	},
	{
		accessorKey: "avg_ms",
		header: "Avg",
		cell: ({ row }) => (
			<DataTableValuePill>
				{formatDurationMs(row.original.avg_ms)}
			</DataTableValuePill>
		),
	},
	{
		accessorKey: "p95_ms",
		header: "p95",
		cell: ({ row }) => (
			<DataTableValuePill>
				{formatDurationMs(row.original.p95_ms)}
			</DataTableValuePill>
		),
	},
];

const versionColumns: ColumnDef<VersionRow>[] = [
	{
		accessorKey: "agentVersionId",
		header: "Version",
		cell: ({ row }) => (
			<span className="font-mono text-xs text-foreground">
				{row.original.agentVersionId.slice(0, 12)}…
			</span>
		),
	},
	{
		accessorKey: "sessions",
		header: "Sessions",
		cell: ({ row }) => (
			<DataTableValuePill>{row.original.sessions}</DataTableValuePill>
		),
	},
	{
		accessorKey: "avg_duration_ms",
		header: "Avg duration",
		cell: ({ row }) => (
			<DataTableValuePill>
				{formatDurationMs(row.original.avg_duration_ms)}
			</DataTableValuePill>
		),
	},
];

export type AgentMonitorServerStats = {
	total_sessions: number;
	active_sessions: number;
	completed_sessions: number;
	failed_sessions?: number;
	avg_duration_ms: number | null;
	p95_duration_ms?: number | null;
	success_rate?: number | null;
	by_channel?: Record<string, number>;
	by_direction?: Record<string, number>;
	by_end_reason?: Record<string, number>;
	cost?: { total_cost_micros?: number } | null;
	quality?: { talk_ratio_user?: number | null } | null;
	actions?: {
		transfers?: number;
		reschedules?: number;
		voicemails?: number;
		tool_call_total?: number;
	} | null;
	latency?: {
		metrics?: Array<{
			metric: string;
			avg_ms: number | null;
			p95_ms: number | null;
		}>;
	} | null;
	versions?: VersionRow[];
	collected_fields_sample?: Array<{
		id: string;
		key: string;
		value: unknown;
	}>;
};

export function AgentMonitorStats({
	stats,
	daily,
}: {
	stats: AgentStats;
	daily: AgentStats["daily"];
}) {
	const sparkline = daily.map((d) => ({
		value: d.count,
		label: d.date.slice(5),
	}));
	const completedSparkline = daily.map((d) => ({
		value: d.completed,
		label: d.date.slice(5),
	}));
	const failedSparkline = daily.map((d) => ({
		value: d.failed,
		label: d.date.slice(5),
	}));
	const deltaPct = computeDeltaPct(daily.map((d) => d.count));
	const completedDeltaPct = computeDeltaPct(daily.map((d) => d.completed));
	const completionRate =
		stats.total_sessions > 0
			? stats.completed_sessions / stats.total_sessions
			: 0;

	return (
		<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
				subtitle="Queued or live"
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
				donutLabel={`${(completionRate * 100).toFixed(0)}%`}
				donutCaption="Complete"
				deltaPct={completedDeltaPct}
			/>
			<StatCard
				title="Failed"
				subtitle="Last 30 days"
				value={stats.failed_sessions.toLocaleString()}
				variant="line"
				color="var(--chart-5)"
				sparkline={failedSparkline}
			/>
			<StatCard
				title="Avg duration"
				subtitle="Last 30 days"
				value={formatDurationMs(stats.avg_duration_ms)}
				variant="line"
				color="var(--chart-3)"
				sparkline={completedSparkline}
			/>
			<StatCard
				title="Total talk time"
				subtitle="All sessions"
				value={formatDurationMs(stats.total_duration_ms || null)}
				variant="area"
				color="var(--chart-4)"
				sparkline={completedSparkline}
			/>
		</div>
	);
}

export function AgentMonitorBody({
	server,
	chartStats,
}: {
	server: AgentMonitorServerStats;
	chartStats: AgentStats;
}) {
	const daily = chartStats.daily;
	const failedSessions = server.failed_sessions ?? chartStats.failed_sessions;
	const latencyRows = useMemo(
		() => (server.latency?.metrics ?? []) as LatencyRow[],
		[server.latency?.metrics],
	);
	const versionRows = useMemo(
		() => (server.versions ?? []) as VersionRow[],
		[server.versions],
	);

	const outcomeBreakdown = {
		completed: chartStats.completed_sessions,
		failed: chartStats.failed_sessions,
		active: chartStats.active_sessions,
		other: Math.max(
			0,
			chartStats.total_sessions -
				chartStats.completed_sessions -
				chartStats.failed_sessions -
				chartStats.active_sessions,
		),
	};

	return (
		<div className="mx-auto w-full max-w-[1600px] space-y-6">
			<AgentMonitorStats stats={chartStats} daily={daily} />

			<div className="grid gap-4 xl:grid-cols-3">
				<div className="xl:col-span-2">
					<ActivityChartCard daily={daily} />
				</div>
				<ChannelBreakdownCard
					title="By channel"
					byChannel={server.by_channel ?? {}}
				/>
			</div>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">Operations</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<MetricKpiCard
						title="Success rate"
						value={pct(server.success_rate)}
						icon={CheckCircle2Icon}
						footerText={`${chartStats.completed_sessions.toLocaleString()} completed · ${failedSessions.toLocaleString()} failed`}
					/>
					<MetricKpiCard
						title="p95 duration"
						value={formatDurationMs(server.p95_duration_ms ?? null)}
						icon={ClockIcon}
						footerStat={{
							label: "Sessions (30d)",
							value: chartStats.total_sessions.toLocaleString(),
						}}
					/>
					<MetricKpiCard
						title="Est. cost"
						value={`$${((server.cost?.total_cost_micros ?? 0) / 1_000_000).toFixed(2)}`}
						icon={DollarSignIcon}
					/>
					<MetricKpiCard
						title="User talk ratio"
						value={pct(server.quality?.talk_ratio_user)}
						icon={PhoneIcon}
					/>
				</div>
				<div className="grid gap-4 lg:grid-cols-2">
					<ChannelBreakdownCard
						title="End reasons"
						hint="How sessions ended"
						byChannel={server.by_end_reason ?? {}}
					/>
					<GaugeBreakdownCard
						title="Direction"
						hint="Inbound / outbound / web"
						items={server.by_direction ?? {}}
					/>
				</div>
				<div className="grid gap-4 lg:grid-cols-2">
					<ChannelBreakdownCard
						title="Outcomes"
						hint="Session outcome mix"
						byChannel={outcomeBreakdown}
					/>
					<div className="grid gap-4 sm:grid-cols-2">
						<MetricKpiCard
							title="Transfers"
							value={String(server.actions?.transfers ?? 0)}
							icon={ActivityIcon}
						/>
						<MetricKpiCard
							title="Tool calls"
							value={String(server.actions?.tool_call_total ?? 0)}
							icon={ActivityIcon}
						/>
						<MetricKpiCard
							title="Reschedules"
							value={String(server.actions?.reschedules ?? 0)}
							icon={ClockIcon}
						/>
						<MetricKpiCard
							title="Voicemails"
							value={String(server.actions?.voicemails ?? 0)}
							icon={XCircleIcon}
						/>
					</div>
				</div>
			</section>

			{latencyRows.length > 0 ? (
				<section className="space-y-2">
					<h3 className="text-base font-semibold">Latency</h3>
					<StandardDataTable
						columns={latencyColumns}
						data={latencyRows}
						getRowId={(row) => row.metric}
						emptyMessage="No latency metrics collected yet."
					/>
				</section>
			) : null}

			{versionRows.length > 0 ? (
				<section className="space-y-2">
					<h3 className="text-base font-semibold">By version</h3>
					<StandardDataTable
						columns={versionColumns}
						data={versionRows}
						getRowId={(row) => row.agentVersionId}
						emptyMessage="No version activity yet."
					/>
				</section>
			) : null}

			{(server.collected_fields_sample?.length ?? 0) > 0 ? (
				<section className="space-y-2">
					<h3 className="text-base font-semibold">
						Collected fields
					</h3>
					<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
						{(server.collected_fields_sample ?? [])
							.slice(0, 8)
							.map((f) => (
								<div
									key={f.id}
									className="rounded-xl border border-border/70 bg-card px-3 py-2 text-sm shadow-xs"
								>
									<span className="font-medium">{f.key}</span>
									<span className="text-muted-foreground">
										: {String(f.value)}
									</span>
								</div>
							))}
					</div>
				</section>
			) : null}
		</div>
	);
}
