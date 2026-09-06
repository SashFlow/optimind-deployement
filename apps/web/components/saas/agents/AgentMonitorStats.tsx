"use client";

import {
	ActivityIcon,
	CheckCircle2Icon,
	ClockIcon,
	PhoneIcon,
	XCircleIcon,
} from "lucide-react";
import { StatCard } from "@/components/saas/app/StatCard";
import type { AgentStats } from "./lib/types";

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

export function AgentMonitorStats({ stats }: { stats: AgentStats }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
			<StatCard
				title="Total sessions"
				value={stats.total_sessions.toLocaleString()}
				icon={PhoneIcon}
			/>
			<StatCard
				title="Active now"
				value={stats.active_sessions.toLocaleString()}
				icon={ActivityIcon}
				description="Queued or live"
			/>
			<StatCard
				title="Completed"
				value={stats.completed_sessions.toLocaleString()}
				icon={CheckCircle2Icon}
			/>
			<StatCard
				title="Failed"
				value={stats.failed_sessions.toLocaleString()}
				icon={XCircleIcon}
			/>
			<StatCard
				title="Avg duration"
				value={formatDuration(stats.avg_duration_ms)}
				icon={ClockIcon}
			/>
			<StatCard
				title="Total talk time"
				value={formatDuration(stats.total_duration_ms)}
				icon={ClockIcon}
			/>
		</div>
	);
}
