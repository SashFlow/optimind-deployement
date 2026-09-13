"use client";

import {
	ArrowDownToLineIcon,
	ArrowUpFromLineIcon,
	ClockIcon,
	HardDriveIcon,
	PhoneIncomingIcon,
	PhoneOutgoingIcon,
	PhoneIcon,
	VideoIcon,
} from "lucide-react";
import type { DashboardAnalytics } from "@/services/api/types";

import { AnalyticsLineChart } from "./AnalyticsLineChart";
import { ConnectionSuccessCard } from "./ConnectionSuccessCard";
import { DonutBreakdownCard } from "./DonutBreakdownCard";
import { MetricKpiCard } from "./MetricKpiCard";
import { TopCountriesCard } from "./TopCountriesCard";
import { formatBytes, formatDurationMs, formatMinutes } from "./format";

/** LiveKit Cloud analytics — gated behind the Analytics expand control. */
export function DashboardLivekitAnalyticsSections({
	analytics,
}: {
	analytics: DashboardAnalytics;
}) {
	const { livekit } = analytics;
	const lkUnavailable = !livekit.available;

	const participantsData = livekit.participants_daily.map((d) => ({
		date: d.date,
		count: d.count,
	}));

	const transferData = livekit.data_transfer_daily.map((d) => ({
		date: d.date,
		downstream: d.downstream,
		upstream: d.upstream,
	}));

	return (
		<div className="space-y-8">
			{lkUnavailable && livekit.message ? (
				<p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
					{livekit.message}
				</p>
			) : null}

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<ConnectionSuccessCard
					pct={livekit.connection_success_pct}
					unavailable={lkUnavailable}
				/>
				<DonutBreakdownCard
					title="Platforms"
					hint="Operating systems reported by LiveKit session participants."
					items={livekit.platforms}
					unavailable={lkUnavailable}
				/>
				<DonutBreakdownCard
					title="Connection type"
					hint="WebRTC connection types (UDP, TURN, …) from session details."
					items={livekit.connection_types}
					unavailable={lkUnavailable}
				/>
				<TopCountriesCard
					countries={livekit.top_countries}
					unavailable={lkUnavailable}
				/>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<MetricKpiCard
					title="WebRTC participant minutes"
					value={
						lkUnavailable
							? "—"
							: formatMinutes(livekit.webrtc_participant_minutes)
					}
					icon={ClockIcon}
					detail="Billable connection minutes"
				/>
				<MetricKpiCard
					title="Total upstream"
					value={
						lkUnavailable
							? "—"
							: formatBytes(livekit.total_upstream_bytes)
					}
					icon={ArrowUpFromLineIcon}
					detail="Bandwidth out"
				/>
				<MetricKpiCard
					title="Total downstream"
					value={
						lkUnavailable
							? "—"
							: formatBytes(livekit.total_downstream_bytes)
					}
					icon={ArrowDownToLineIcon}
					detail="Bandwidth in"
				/>
			</div>

			<DonutBreakdownCard
				title="Participant minutes by kind"
				hint="WebRTC minutes from LiveKit; SIP minutes from your org sessions."
				items={livekit.participant_minutes_by_kind}
				mode="minutes"
				unavailable={lkUnavailable}
			/>

			<div className="grid gap-4 xl:grid-cols-2">
				<AnalyticsLineChart
					title="Participants"
					hint="Daily sum of participants across LiveKit Cloud sessions."
					data={participantsData}
					series={[
						{
							key: "count",
							label: "Participants",
							color: "var(--chart-1)",
						},
					]}
					unavailable={lkUnavailable}
					variant="bar"
				/>
				<AnalyticsLineChart
					title="Data transfer"
					hint="Daily upstream and downstream bytes from LiveKit Cloud."
					data={transferData}
					series={[
						{
							key: "downstream",
							label: "Downstream",
							color: "var(--chart-1)",
						},
						{
							key: "upstream",
							label: "Upstream",
							color: "var(--chart-3)",
						},
					]}
					unavailable={lkUnavailable}
					yTickFormatter={(v) => formatBytes(v)}
					variant="line"
				/>
			</div>
		</div>
	);
}

/** Org telephony + egress metrics (no LiveKit Cloud dependency). */
export function DashboardTelephonySections({
	analytics,
}: {
	analytics: DashboardAnalytics;
}) {
	const { telephony, egress } = analytics;

	const minutesChartData = telephony.minutes_daily.map((d) => ({
		date: d.date,
		inbound: d.inbound_ms / 60_000,
		outbound: d.outbound_ms / 60_000,
		total: d.total_ms / 60_000,
	}));

	const sipChartData = telephony.sip_sessions_daily.map((d) => ({
		date: d.date,
		count: d.count,
	}));

	const egressData = egress.by_type_daily.map((d) => ({
		date: d.date,
		participant: d.participant,
		room_composite: d.room_composite,
		track: d.track,
		web: d.web,
	}));

	const answerRate = telephony.answer_rate;

	return (
		<div className="space-y-8">
			<section className="space-y-3">
				<h3 className="text-base font-semibold">Telephony</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<MetricKpiCard
						title="Total inbound"
						value={formatDurationMs(telephony.total_inbound_ms)}
						icon={PhoneIncomingIcon}
						detail="Inbound session duration"
					/>
					<MetricKpiCard
						title="Total outbound"
						value={formatDurationMs(telephony.total_outbound_ms)}
						icon={PhoneOutgoingIcon}
						detail="Outbound session duration"
					/>
					<MetricKpiCard
						title="Answer rate"
						value={
							answerRate != null
								? `${(answerRate * 100).toFixed(1)}%`
								: "—"
						}
						icon={PhoneIcon}
						detail="SIP/phone connected"
						progress={answerRate ?? null}
					/>
					<MetricKpiCard
						title="SIP sessions"
						value={String(telephony.sip_sessions_total)}
						icon={PhoneIcon}
						detail="Selected period"
						sparkline={sipChartData.map((d) => ({
							value: d.count,
						}))}
						comparisonLabel="Daily trend"
					/>
				</div>
				<div className="grid gap-4 xl:grid-cols-2">
					<AnalyticsLineChart
						title="Minutes"
						hint="Inbound, outbound, and total session duration for your organization."
						data={minutesChartData}
						series={[
							{
								key: "inbound",
								label: "Inbound",
								color: "var(--chart-1)",
							},
							{
								key: "outbound",
								label: "Outbound",
								color: "var(--chart-3)",
							},
							{
								key: "total",
								label: "Total minutes",
								color: "var(--chart-2)",
							},
						]}
						yTickFormatter={(v) =>
							v < 1
								? `${Math.round(v * 60)}s`
								: `${Math.round(v)}m`
						}
						variant="line"
					/>
					<AnalyticsLineChart
						title="SIP sessions"
						hint="Daily count of SIP-channel sessions for your organization."
						data={sipChartData}
						series={[
							{
								key: "count",
								label: "SIP sessions",
								color: "var(--chart-1)",
							},
						]}
						variant="bar"
					/>
				</div>
			</section>

			<section className="space-y-3">
				<h3 className="text-base font-semibold">Egress</h3>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					<MetricKpiCard
						title="Total egress count"
						value={String(egress.total_count)}
						icon={VideoIcon}
						detail="Egress jobs created"
					/>
					<MetricKpiCard
						title="Billable duration"
						value={formatDurationMs(
							egress.total_billable_duration_ms,
						)}
						icon={ClockIcon}
						detail="Recorded egress time"
					/>
					<MetricKpiCard
						title="Track egress duration"
						value={formatDurationMs(egress.total_track_duration_ms)}
						icon={HardDriveIcon}
						detail="Track jobs only"
					/>
				</div>
				<AnalyticsLineChart
					title="Egresses"
					hint="Daily egress job counts by type."
					data={egressData}
					series={[
						{
							key: "participant",
							label: "Participant",
							color: "var(--chart-1)",
						},
						{
							key: "room_composite",
							label: "Room composite",
							color: "var(--chart-2)",
						},
						{
							key: "track",
							label: "Track",
							color: "var(--chart-3)",
						},
						{
							key: "web",
							label: "Web",
							color: "var(--chart-4)",
						},
					]}
					variant="bar"
				/>
			</section>
		</div>
	);
}

/** @deprecated Prefer DashboardLivekitAnalyticsSections + DashboardTelephonySections */
export function DashboardAnalyticsSections({
	analytics,
}: {
	analytics: DashboardAnalytics;
}) {
	return (
		<div className="space-y-8">
			<DashboardLivekitAnalyticsSections analytics={analytics} />
			<DashboardTelephonySections analytics={analytics} />
		</div>
	);
}
