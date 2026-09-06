"use client";

import type { DashboardAnalytics } from "@/services/api/types";

import { AnalyticsLineChart } from "./AnalyticsLineChart";
import { BigNumberCard } from "./BigNumberCard";
import { ConnectionSuccessCard } from "./ConnectionSuccessCard";
import { DonutBreakdownCard } from "./DonutBreakdownCard";
import { TopCountriesCard } from "./TopCountriesCard";
import { formatBytes, formatDurationMs, formatMinutes } from "./format";

export function DashboardAnalyticsSections({
	analytics,
}: {
	analytics: DashboardAnalytics;
}) {
	const { livekit, telephony, egress } = analytics;
	const lkUnavailable = !livekit.available;

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

	const participantsData = livekit.participants_daily.map((d) => ({
		date: d.date,
		count: d.count,
	}));

	const transferData = livekit.data_transfer_daily.map((d) => ({
		date: d.date,
		downstream: d.downstream,
		upstream: d.upstream,
	}));

	const egressData = egress.by_type_daily.map((d) => ({
		date: d.date,
		participant: d.participant,
		room_composite: d.room_composite,
		track: d.track,
		web: d.web,
	}));

	return (
		<div className="space-y-8">
			{lkUnavailable && livekit.message ? (
				<p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
					{livekit.message}
				</p>
			) : null}

			{/* 1. Connection quality */}
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

			{/* 2. Participant minutes */}
			<div className="grid gap-4 lg:grid-cols-2">
				<BigNumberCard
					title="WebRTC participant minutes"
					hint="Billable connection minutes from LiveKit analytics."
					value={formatMinutes(livekit.webrtc_participant_minutes)}
					unavailable={lkUnavailable}
				/>
				<DonutBreakdownCard
					title="Participant minutes by kind"
					hint="WebRTC minutes from LiveKit; SIP minutes from your org sessions."
					items={livekit.participant_minutes_by_kind}
					mode="minutes"
					unavailable={lkUnavailable}
				/>
			</div>
			<AnalyticsLineChart
				title="Participants"
				hint="Daily sum of participants across LiveKit Cloud sessions."
				data={participantsData}
				series={[{ key: "count", label: "Participants" }]}
				unavailable={lkUnavailable}
			/>

			{/* 3. Minutes + SIP */}
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
				<AnalyticsLineChart
					title="Minutes"
					hint="Inbound, outbound, and total session duration for your organization."
					data={minutesChartData}
					series={[
						{ key: "inbound", label: "Inbound" },
						{ key: "outbound", label: "Outbound" },
						{ key: "total", label: "Total minutes" },
					]}
					yTickFormatter={(v) =>
						v < 1 ? `${Math.round(v * 60)}s` : `${Math.round(v)}m`
					}
				/>
				<BigNumberCard
					title="Total inbound"
					hint="Sum of inbound session duration."
					value={formatDurationMs(telephony.total_inbound_ms)}
				/>
				<BigNumberCard
					title="Total outbound"
					hint="Sum of outbound session duration."
					value={formatDurationMs(telephony.total_outbound_ms)}
				/>
			</div>
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
				<AnalyticsLineChart
					title="SIP sessions"
					hint="Daily count of SIP-channel sessions for your organization."
					data={sipChartData}
					series={[{ key: "count", label: "SIP sessions" }]}
				/>
				<BigNumberCard
					title="Total SIP sessions"
					hint="SIP sessions in the selected period."
					value={String(telephony.sip_sessions_total)}
				/>
			</div>

			{/* 4. Data transfer */}
			<div className="grid gap-4 sm:grid-cols-2">
				<BigNumberCard
					title="Total upstream"
					hint="Sum of LiveKit bandwidthOut across sessions."
					value={formatBytes(livekit.total_upstream_bytes)}
					unavailable={lkUnavailable}
				/>
				<BigNumberCard
					title="Total downstream"
					hint="Sum of LiveKit bandwidthIn across sessions."
					value={formatBytes(livekit.total_downstream_bytes)}
					unavailable={lkUnavailable}
				/>
			</div>
			<AnalyticsLineChart
				title="Data transfer"
				hint="Daily upstream and downstream bytes from LiveKit Cloud."
				data={transferData}
				series={[
					{ key: "downstream", label: "Downstream" },
					{ key: "upstream", label: "Upstream" },
				]}
				unavailable={lkUnavailable}
				yTickFormatter={(v) => formatBytes(v)}
			/>

			{/* 5. Egress */}
			<div className="grid gap-4 sm:grid-cols-3">
				<BigNumberCard
					title="Total egress count"
					hint="Egress jobs created for your organization."
					value={String(egress.total_count)}
				/>
				<BigNumberCard
					title="Total billable egress duration"
					hint="Sum of recorded egress durations."
					value={formatDurationMs(egress.total_billable_duration_ms)}
				/>
				<BigNumberCard
					title="Total track egress duration"
					hint="Duration for track egress jobs only."
					value={formatDurationMs(egress.total_track_duration_ms)}
				/>
			</div>
			<AnalyticsLineChart
				title="Egresses"
				hint="Daily egress job counts by type."
				data={egressData}
				series={[
					{ key: "participant", label: "Participant" },
					{ key: "room_composite", label: "Room composite" },
					{ key: "track", label: "Track" },
					{ key: "web", label: "Web" },
				]}
			/>
		</div>
	);
}
