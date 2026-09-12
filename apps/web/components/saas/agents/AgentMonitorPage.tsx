"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { AgentActiveSessions } from "@/components/saas/agents/AgentActiveSessions";
import { AgentMonitorBreakdown } from "@/components/saas/agents/AgentMonitorBreakdown";
import { AgentMonitorStats } from "@/components/saas/agents/AgentMonitorStats";
import { useAgentSessionsQuery } from "@/components/saas/agents/lib/hooks";
import type { AgentStats } from "@/components/saas/agents/lib/types";
import { PageSectionSkeleton } from "@/components/saas/shared/skeletons";
import { useAgentServerStatsQuery } from "@/services/api/hooks";

function formatDuration(ms: number | null | undefined) {
	if (ms == null) return "—";
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

function pct(value: number | null | undefined) {
	if (value == null) return "—";
	return `${(value * 100).toFixed(1)}%`;
}

export default function AgentMonitorPage() {
	const params = useParams<{ agentId: string }>();
	const serverStatsQuery = useAgentServerStatsQuery(params.agentId, 30);
	const sessionsQuery = useAgentSessionsQuery(params.agentId, {
		refetchInterval: 10_000,
	});

	if (serverStatsQuery.isLoading || sessionsQuery.isLoading) {
		return <PageSectionSkeleton variant="monitor" />;
	}

	if (serverStatsQuery.isError || !serverStatsQuery.data) {
		return (
			<p className="p-6 text-sm text-destructive">
				Failed to load agent stats.
			</p>
		);
	}

	const server = serverStatsQuery.data;
	const chartStats: AgentStats = {
		total_sessions: server.total_sessions,
		active_sessions: server.active_sessions,
		completed_sessions: server.completed_sessions,
		failed_sessions: server.failed_sessions ?? 0,
		avg_duration_ms: server.avg_duration_ms,
		total_duration_ms: 0,
		daily: [],
	};

	return (
		<div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 py-6 md:px-6">
			<AgentMonitorStats stats={chartStats} />
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Success rate</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{pct(server.success_rate)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">p95 duration</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{formatDuration(server.p95_duration_ms)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Est. cost</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						$
						{(
							(server.cost?.total_cost_micros ?? 0) / 1_000_000
						).toFixed(2)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">
							User talk ratio
						</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{pct(server.quality?.talk_ratio_user)}
					</CardContent>
				</Card>
			</div>
			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2 space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">
								Tools &amp; actions
							</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-2 sm:grid-cols-4 text-sm">
							<div>
								Transfers: {server.actions?.transfers ?? 0}
							</div>
							<div>
								Reschedules: {server.actions?.reschedules ?? 0}
							</div>
							<div>
								Voicemails: {server.actions?.voicemails ?? 0}
							</div>
							<div>
								Tool calls:{" "}
								{server.actions?.tool_call_total ?? 0}
							</div>
						</CardContent>
					</Card>
					{(server.latency?.metrics?.length ?? 0) > 0 ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">
									Latency
								</CardTitle>
							</CardHeader>
							<CardContent className="overflow-x-auto text-sm">
								<table className="w-full">
									<thead>
										<tr className="text-left text-muted-foreground">
											<th className="pb-2">Metric</th>
											<th className="pb-2">Avg</th>
											<th className="pb-2">p95</th>
										</tr>
									</thead>
									<tbody>
										{(server.latency?.metrics ?? []).map(
											(m: {
												metric: string;
												avg_ms: number | null;
												p95_ms: number | null;
											}) => (
												<tr
													key={m.metric}
													className="border-t border-border/60"
												>
													<td className="py-2">
														{m.metric}
													</td>
													<td>
														{formatDuration(
															m.avg_ms,
														)}
													</td>
													<td>
														{formatDuration(
															m.p95_ms,
														)}
													</td>
												</tr>
											),
										)}
									</tbody>
								</table>
							</CardContent>
						</Card>
					) : null}
					{(server.versions?.length ?? 0) > 0 ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">
									By version
								</CardTitle>
							</CardHeader>
							<CardContent className="overflow-x-auto text-sm">
								<table className="w-full">
									<thead>
										<tr className="text-left text-muted-foreground">
											<th className="pb-2">Version</th>
											<th className="pb-2">Sessions</th>
											<th className="pb-2">
												Avg duration
											</th>
										</tr>
									</thead>
									<tbody>
										{(server.versions ?? []).map(
											(v: {
												agentVersionId: string;
												sessions: number;
												avg_duration_ms: number | null;
											}) => (
												<tr
													key={v.agentVersionId}
													className="border-t border-border/60"
												>
													<td className="py-2 font-mono text-xs">
														{v.agentVersionId.slice(
															0,
															12,
														)}
														…
													</td>
													<td>{v.sessions}</td>
													<td>
														{formatDuration(
															v.avg_duration_ms,
														)}
													</td>
												</tr>
											),
										)}
									</tbody>
								</table>
							</CardContent>
						</Card>
					) : null}
				</div>
				<div className="space-y-4">
					<AgentMonitorBreakdown stats={chartStats} />
					{(server.collected_fields_sample?.length ?? 0) > 0 ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">
									Collected fields
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								{(server.collected_fields_sample ?? [])
									.slice(0, 8)
									.map(
										(f: {
											id: string;
											key: string;
											value: unknown;
										}) => (
											<div
												key={f.id}
												className="rounded-md border border-border/60 px-2 py-1"
											>
												<span className="font-medium">
													{f.key}
												</span>
												: {String(f.value)}
											</div>
										),
									)}
							</CardContent>
						</Card>
					) : null}
				</div>
			</div>
			<AgentActiveSessions
				sessions={sessionsQuery.data ?? []}
				agentId={params.agentId}
			/>
		</div>
	);
}
