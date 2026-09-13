"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
	ArrowLeftRightIcon,
	AudioLinesIcon,
	CalendarClockIcon,
	CheckCircle2Icon,
	ClockIcon,
	DollarSignIcon,
	MessageSquareTextIcon,
	MicIcon,
	PlugZapIcon,
	SparklesIcon,
	TypeIcon,
	WrenchIcon,
	XCircleIcon,
} from "lucide-react";
import { useMemo } from "react";
import type { DashboardStats } from "@/services/api/types";
import {
	useDashboardActionsQuery,
	useDashboardCostQuery,
	useDashboardLatencyQuery,
	useDashboardQualityQuery,
	useDashboardUsageQuery,
} from "@/services/api/hooks";
import {
	DataTableTypeBadge,
	DataTableValuePill,
	StandardDataTable,
} from "@/components/saas/shared/StandardDataTable";
import { AnalyticsLineChart } from "./AnalyticsLineChart";
import { ChannelBreakdownCard } from "./ChannelBreakdownCard";
import { FailuresActivityCard } from "./FailuresActivityCard";
import { formatDurationMs } from "./format";
import { GaugeBreakdownCard } from "./GaugeBreakdownCard";
import { MetricKpiCard } from "./MetricKpiCard";

function formatUsd(micros: number) {
	return `$${(micros / 1_000_000).toFixed(2)}`;
}

function pct(value: number | null | undefined) {
	if (value == null) return "—";
	return `${(value * 100).toFixed(1)}%`;
}

function halfWindowSum(values: number[]): {
	prior: number | null;
	deltaPct: number | null;
} {
	if (values.length < 4) return { prior: null, deltaPct: null };
	const mid = Math.floor(values.length / 2);
	const prior = values.slice(0, mid).reduce((sum, n) => sum + n, 0);
	const recent = values.slice(mid).reduce((sum, n) => sum + n, 0);
	if (prior === 0) {
		return { prior, deltaPct: recent === 0 ? 0 : 100 };
	}
	return {
		prior,
		deltaPct: ((recent - prior) / Math.abs(prior)) * 100,
	};
}

type AgentRow = NonNullable<DashboardStats["by_agent"]>[number];

type ToolRow = {
	toolName: string;
	count: number;
	failure_rate: number | null;
	avg_latency_ms: number | null;
};

type LatencyRow = {
	metric: string;
	count: number;
	avg_ms: number | null;
	p50_ms: number | null;
	p95_ms: number | null;
};

const agentColumns: ColumnDef<AgentRow>[] = [
	{
		accessorKey: "name",
		header: "Agent",
		cell: ({ row }) => (
			<span className="font-medium text-foreground">
				{row.original.name}
			</span>
		),
	},
	{
		accessorKey: "count",
		header: "Sessions",
		cell: ({ row }) => (
			<DataTableValuePill>{row.original.count}</DataTableValuePill>
		),
	},
	{
		accessorKey: "completed",
		header: "Completed",
		cell: ({ row }) => (
			<DataTableValuePill>{row.original.completed}</DataTableValuePill>
		),
	},
	{
		accessorKey: "failed",
		header: "Failed",
		cell: ({ row }) => (
			<DataTableValuePill>{row.original.failed}</DataTableValuePill>
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

const toolColumns: ColumnDef<ToolRow>[] = [
	{
		accessorKey: "toolName",
		header: "Tool",
		cell: ({ row }) => (
			<span className="font-medium text-foreground">
				{row.original.toolName}
			</span>
		),
	},
	{
		accessorKey: "count",
		header: "Count",
		cell: ({ row }) => (
			<DataTableValuePill>{row.original.count}</DataTableValuePill>
		),
	},
	{
		accessorKey: "failure_rate",
		header: "Fail rate",
		cell: ({ row }) => (
			<DataTableTypeBadge>
				{pct(row.original.failure_rate)}
			</DataTableTypeBadge>
		),
	},
	{
		accessorKey: "avg_latency_ms",
		header: "Avg latency",
		cell: ({ row }) => (
			<DataTableValuePill>
				{formatDurationMs(row.original.avg_latency_ms)}
			</DataTableValuePill>
		),
	},
];

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
		accessorKey: "count",
		header: "Count",
		cell: ({ row }) => (
			<DataTableValuePill>{row.original.count}</DataTableValuePill>
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
		accessorKey: "p50_ms",
		header: "p50",
		cell: ({ row }) => (
			<DataTableValuePill>
				{formatDurationMs(row.original.p50_ms)}
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

export function DashboardExtendedSections({
	organizationId,
	stats,
	enabled = true,
}: {
	organizationId: string;
	stats: DashboardStats;
	enabled?: boolean;
}) {
	const usageQuery = useDashboardUsageQuery(organizationId, 30, { enabled });
	const costQuery = useDashboardCostQuery(organizationId, 30, { enabled });
	const qualityQuery = useDashboardQualityQuery(organizationId, 30, {
		enabled,
	});
	const actionsQuery = useDashboardActionsQuery(organizationId, 30, {
		enabled,
	});
	const latencyQuery = useDashboardLatencyQuery(organizationId, 30, {
		enabled,
	});

	const usage = usageQuery.data;
	const cost = costQuery.data;
	const quality = qualityQuery.data;
	const actions = actionsQuery.data;
	const latency = latencyQuery.data;

	const costTrend = halfWindowSum(
		(cost?.daily ?? []).map((d) => d.cost_micros),
	);
	const costSparkline = (cost?.daily ?? []).map((d) => ({
		value: d.cost_micros / 1_000_000,
	}));
	const failedSessions = stats.failed_sessions ?? 0;
	const connectMs = stats.avg_time_to_connect_ms ?? null;
	/** Treat sub-5s connect as strong; clamp for the compact progress bar. */
	const connectProgress =
		connectMs != null && connectMs > 0
			? Math.max(0, Math.min(1, 1 - connectMs / 5_000))
			: null;

	const agentRows = useMemo(
		() => (stats.by_agent ?? []).slice(0, 50),
		[stats.by_agent],
	);
	const toolRows = useMemo(
		() => (actions?.tools ?? []) as ToolRow[],
		[actions?.tools],
	);
	const latencyRows = useMemo(
		() => (latency?.metrics ?? []) as LatencyRow[],
		[latency?.metrics],
	);

	return (
		<div className="space-y-8">
			<section className="space-y-3">
				<h3 className="text-base font-semibold">Operations</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<MetricKpiCard
						title="Success rate"
						value={pct(stats.success_rate)}
						icon={CheckCircle2Icon}
						footerText={`${stats.completed_sessions.toLocaleString()} completed · ${failedSessions.toLocaleString()} failed`}
					/>
					<MetricKpiCard
						title="p95 duration"
						value={formatDurationMs(stats.p95_duration_ms ?? null)}
						icon={ClockIcon}
						footerStat={{
							label: "Sessions (30d)",
							value: stats.total_sessions.toLocaleString(),
						}}
					/>
					<MetricKpiCard
						title="Time to connect"
						value={formatDurationMs(connectMs)}
						icon={PlugZapIcon}
						detail="Average connect latency"
						progress={connectProgress}
					/>
					<MetricKpiCard
						title="Est. cost (30d)"
						value={
							cost
								? formatUsd(cost.total_cost_micros)
								: costQuery.isLoading
									? "…"
									: "—"
						}
						icon={DollarSignIcon}
						deltaPct={costTrend.deltaPct}
						invertDelta
						comparisonLabel="vs prior period"
						sparkline={costSparkline}
					/>
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
				{agentRows.length > 0 ? (
					<div className="space-y-2">
						<h4 className="text-sm font-medium">Top agents</h4>
						<StandardDataTable
							columns={agentColumns}
							data={agentRows}
							getRowId={(row) => row.agentId}
							emptyMessage="No agent activity yet."
						/>
					</div>
				) : null}
				{(stats.failures?.length ?? 0) > 0 ? (
					<FailuresActivityCard failures={stats.failures ?? []} />
				) : null}
			</section>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">Usage &amp; cost</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<MetricKpiCard
						title="Input tokens"
						value={(usage?.totals.input_tokens ?? 0).toLocaleString()}
						icon={SparklesIcon}
						detail="Last 30 days"
						sparkline={(usage?.daily ?? []).map((d) => ({
							value: d.input_tokens,
						}))}
						comparisonLabel="Daily trend"
					/>
					<MetricKpiCard
						title="Output tokens"
						value={(
							usage?.totals.output_tokens ?? 0
						).toLocaleString()}
						icon={MessageSquareTextIcon}
						detail="Last 30 days"
						sparkline={(usage?.daily ?? []).map((d) => ({
							value: d.output_tokens,
						}))}
						comparisonLabel="Daily trend"
					/>
					<MetricKpiCard
						title="TTS characters"
						value={(usage?.totals.characters ?? 0).toLocaleString()}
						icon={TypeIcon}
						detail="Synthesized speech"
					/>
					<MetricKpiCard
						title="Audio minutes"
						value={(
							(usage?.totals.audio_ms ?? 0) / 60_000
						).toFixed(1)}
						icon={AudioLinesIcon}
						detail="Billable audio"
					/>
				</div>
				{usage?.daily?.length ? (
					<AnalyticsLineChart
						title="Token burn"
						hint="Daily input + output tokens"
						data={usage.daily.map((d) => ({
							date: d.date,
							tokens: d.input_tokens + d.output_tokens,
						}))}
						series={[
							{
								key: "tokens",
								label: "Tokens",
								color: "var(--chart-1)",
							},
						]}
						variant="bar"
					/>
				) : null}
				{cost?.by_modality?.length ? (
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{cost.by_modality.map((m) => (
							<MetricKpiCard
								key={m.modality}
								title={m.modality}
								value={formatUsd(m.cost_micros)}
								icon={DollarSignIcon}
								detail="Estimated cost"
							/>
						))}
					</div>
				) : null}
			</section>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">
					Conversation quality
				</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<MetricKpiCard
						title="Avg words"
						value={
							quality?.avg_word_count != null
								? String(quality.avg_word_count)
								: "—"
						}
						icon={TypeIcon}
						detail="Per session"
					/>
					<MetricKpiCard
						title="Avg turns"
						value={
							quality?.avg_turns != null
								? String(quality.avg_turns)
								: "—"
						}
						icon={MessageSquareTextIcon}
						detail="Per session"
					/>
					<MetricKpiCard
						title="User talk ratio"
						value={pct(quality?.talk_ratio_user)}
						icon={MicIcon}
						progress={quality?.talk_ratio_user ?? null}
						detail="Share of talk time"
					/>
					<MetricKpiCard
						title="Interruptions"
						value={pct(quality?.interruption_rate)}
						icon={XCircleIcon}
						invertDelta
						detail="Interrupt rate"
						progress={quality?.interruption_rate ?? null}
					/>
				</div>
			</section>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">Agent actions</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<MetricKpiCard
						title="Tool calls"
						value={String(actions?.tool_call_total ?? 0)}
						icon={WrenchIcon}
						detail="Last 30 days"
					/>
					<MetricKpiCard
						title="Tool fail rate"
						value={pct(actions?.tool_failure_rate)}
						icon={XCircleIcon}
						detail="Across tool calls"
						progress={actions?.tool_failure_rate ?? null}
					/>
					<MetricKpiCard
						title="Transfers"
						value={String(actions?.transfers ?? 0)}
						icon={ArrowLeftRightIcon}
						detail="Hand-offs"
					/>
					<MetricKpiCard
						title="Reschedules"
						value={String(actions?.reschedules ?? 0)}
						icon={CalendarClockIcon}
						detail="Callbacks booked"
					/>
				</div>
				{toolRows.length > 0 ? (
					<div className="space-y-2">
						<h4 className="text-sm font-medium">Tools</h4>
						<StandardDataTable
							columns={toolColumns}
							data={toolRows}
							getRowId={(row) => row.toolName}
							emptyMessage="No tool calls yet."
						/>
					</div>
				) : null}
			</section>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">Latency</h3>
				{latencyRows.length > 0 ? (
					<StandardDataTable
						columns={latencyColumns}
						data={latencyRows}
						getRowId={(row) => row.metric}
						emptyMessage="No latency metrics collected yet."
					/>
				) : (
					<p className="text-sm text-muted-foreground">
						{latencyQuery.isLoading
							? "Loading latency metrics…"
							: "No latency metrics collected yet."}
					</p>
				)}
			</section>
		</div>
	);
}
