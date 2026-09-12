"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type { DashboardStats } from "@/services/api/types";
import {
	useDashboardActionsQuery,
	useDashboardCostQuery,
	useDashboardLatencyQuery,
	useDashboardQualityQuery,
	useDashboardUsageQuery,
} from "@/services/api/hooks";
import { AnalyticsLineChart } from "./AnalyticsLineChart";
import { BigNumberCard } from "./BigNumberCard";
import { DonutBreakdownCard } from "./DonutBreakdownCard";
import { formatDurationMs } from "./format";

function formatUsd(micros: number) {
	return `$${(micros / 1_000_000).toFixed(2)}`;
}

function pct(value: number | null | undefined) {
	if (value == null) return "—";
	return `${(value * 100).toFixed(1)}%`;
}

export function DashboardExtendedSections({
	organizationId,
	stats,
	enabled,
}: {
	organizationId: string;
	stats: DashboardStats;
	enabled: boolean;
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

	const endReasonItems = Object.entries(stats.by_end_reason ?? {}).map(
		([label, count]) => ({
			label,
			pct:
				stats.total_sessions > 0
					? (count / stats.total_sessions) * 100
					: 0,
		}),
	);

	const directionItems = Object.entries(stats.by_direction ?? {}).map(
		([label, count]) => ({
			label,
			pct:
				stats.total_sessions > 0
					? (count / stats.total_sessions) * 100
					: 0,
		}),
	);

	const modalityItems = (usage?.by_modality ?? []).map((m) => ({
		label: m.modality,
		pct: 0,
		value: m.input_tokens + m.output_tokens,
	}));

	return (
		<div className="space-y-8">
			<section className="space-y-3">
				<h3 className="text-base font-semibold">Operations</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<BigNumberCard
						title="Success rate"
						value={pct(stats.success_rate)}
					/>
					<BigNumberCard
						title="p95 duration"
						value={formatDurationMs(stats.p95_duration_ms ?? null)}
					/>
					<BigNumberCard
						title="Time to connect"
						value={formatDurationMs(
							stats.avg_time_to_connect_ms ?? null,
						)}
					/>
					<BigNumberCard
						title="Est. cost (30d)"
						value={
							cost
								? formatUsd(cost.total_cost_micros)
								: costQuery.isLoading
									? "…"
									: "—"
						}
					/>
				</div>
				<div className="grid gap-4 lg:grid-cols-2">
					<DonutBreakdownCard
						title="End reasons"
						hint="How sessions ended"
						items={endReasonItems}
					/>
					<DonutBreakdownCard
						title="Direction"
						hint="Inbound / outbound / web"
						items={directionItems}
					/>
				</div>
				{(stats.by_agent?.length ?? 0) > 0 ? (
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Top agents</CardTitle>
						</CardHeader>
						<CardContent className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-muted-foreground">
										<th className="pb-2">Agent</th>
										<th className="pb-2">Sessions</th>
										<th className="pb-2">Completed</th>
										<th className="pb-2">Failed</th>
										<th className="pb-2">Avg duration</th>
									</tr>
								</thead>
								<tbody>
									{(stats.by_agent ?? [])
										.slice(0, 10)
										.map((row) => (
											<tr
												key={row.agentId}
												className="border-t border-border/60"
											>
												<td className="py-2">
													{row.name}
												</td>
												<td>{row.count}</td>
												<td>{row.completed}</td>
												<td>{row.failed}</td>
												<td>
													{formatDurationMs(
														row.avg_duration_ms,
													)}
												</td>
											</tr>
										))}
								</tbody>
							</table>
						</CardContent>
					</Card>
				) : null}
				{(stats.failures?.length ?? 0) > 0 ? (
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">
								Recent failures
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							{(stats.failures ?? []).slice(0, 8).map((f) => (
								<div
									key={f.id}
									className="rounded-md border border-border/60 px-3 py-2"
								>
									<div className="font-medium">
										{f.agentName} · {f.endReason ?? "error"}
									</div>
									<p className="text-muted-foreground">
										{f.errorMessage ||
											f.errorCode ||
											"No error message"}
									</p>
								</div>
							))}
						</CardContent>
					</Card>
				) : null}
			</section>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">Usage &amp; cost</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<BigNumberCard
						title="Input tokens"
						value={(usage?.totals.input_tokens ?? 0).toLocaleString()}
					/>
					<BigNumberCard
						title="Output tokens"
						value={(
							usage?.totals.output_tokens ?? 0
						).toLocaleString()}
					/>
					<BigNumberCard
						title="TTS characters"
						value={(usage?.totals.characters ?? 0).toLocaleString()}
					/>
					<BigNumberCard
						title="Audio minutes"
						value={(
							(usage?.totals.audio_ms ?? 0) / 60_000
						).toFixed(1)}
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
							{ key: "tokens", label: "Tokens", color: "#2563eb" },
						]}
					/>
				) : null}
				{cost?.by_modality?.length ? (
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">
								Cost by modality
							</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{cost.by_modality.map((m) => (
								<div
									key={m.modality}
									className="rounded-md border border-border/60 px-3 py-2 text-sm"
								>
									<div className="text-muted-foreground">
										{m.modality}
									</div>
									<div className="font-semibold">
										{formatUsd(m.cost_micros)}
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				) : null}
				{modalityItems.length > 0 ? (
					<p className="text-xs text-muted-foreground">
						Modalities with usage:{" "}
						{modalityItems.map((m) => m.label).join(", ")}
					</p>
				) : null}
			</section>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">
					Conversation quality
				</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<BigNumberCard
						title="Avg words"
						value={
							quality?.avg_word_count != null
								? String(quality.avg_word_count)
								: "—"
						}
					/>
					<BigNumberCard
						title="Avg turns"
						value={
							quality?.avg_turns != null
								? String(quality.avg_turns)
								: "—"
						}
					/>
					<BigNumberCard
						title="User talk ratio"
						value={pct(quality?.talk_ratio_user)}
					/>
					<BigNumberCard
						title="Interruptions"
						value={pct(quality?.interruption_rate)}
					/>
				</div>
			</section>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">Agent actions</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<BigNumberCard
						title="Tool calls"
						value={String(actions?.tool_call_total ?? 0)}
					/>
					<BigNumberCard
						title="Tool fail rate"
						value={pct(actions?.tool_failure_rate)}
					/>
					<BigNumberCard
						title="Transfers"
						value={String(actions?.transfers ?? 0)}
					/>
					<BigNumberCard
						title="Reschedules"
						value={String(actions?.reschedules ?? 0)}
					/>
				</div>
				{(actions?.tools?.length ?? 0) > 0 ? (
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">
								Tools
							</CardTitle>
						</CardHeader>
						<CardContent className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-muted-foreground">
										<th className="pb-2">Tool</th>
										<th className="pb-2">Count</th>
										<th className="pb-2">Fail rate</th>
										<th className="pb-2">Avg latency</th>
									</tr>
								</thead>
								<tbody>
									{(actions?.tools ?? []).map((t) => (
										<tr
											key={t.toolName}
											className="border-t border-border/60"
										>
											<td className="py-2">
												{t.toolName}
											</td>
											<td>{t.count}</td>
											<td>{pct(t.failure_rate)}</td>
											<td>
												{formatDurationMs(
													t.avg_latency_ms,
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</CardContent>
					</Card>
				) : null}
			</section>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">Latency</h3>
				{(latency?.metrics?.length ?? 0) > 0 ? (
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">
								Metric percentiles
							</CardTitle>
						</CardHeader>
						<CardContent className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-muted-foreground">
										<th className="pb-2">Metric</th>
										<th className="pb-2">Count</th>
										<th className="pb-2">Avg</th>
										<th className="pb-2">p50</th>
										<th className="pb-2">p95</th>
									</tr>
								</thead>
								<tbody>
									{(latency?.metrics ?? []).map((m) => (
										<tr
											key={m.metric}
											className="border-t border-border/60"
										>
											<td className="py-2">{m.metric}</td>
											<td>{m.count}</td>
											<td>
												{formatDurationMs(m.avg_ms)}
											</td>
											<td>
												{formatDurationMs(m.p50_ms)}
											</td>
											<td>
												{formatDurationMs(m.p95_ms)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</CardContent>
					</Card>
				) : (
					<p className="text-sm text-muted-foreground">
						No latency metrics collected yet.
					</p>
				)}
			</section>
		</div>
	);
}
