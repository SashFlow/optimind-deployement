"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/card";
import type { AgentStats } from "./lib/types";

export function AgentMonitorBreakdown({ stats }: { stats: AgentStats }) {
	const rows = [
		{ label: "Completed", value: stats.completed_sessions },
		{ label: "Failed", value: stats.failed_sessions },
		{ label: "Active", value: stats.active_sessions },
		{
			label: "Other",
			value: Math.max(
				0,
				stats.total_sessions -
					stats.completed_sessions -
					stats.failed_sessions -
					stats.active_sessions,
			),
		},
	];

	return (
		<Card className="h-full rounded-3xl border shadow-sm ring-1 ring-black/5">
			<CardHeader>
				<CardTitle>Breakdown</CardTitle>
				<CardDescription>Session outcomes</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{rows.map((row) => (
					<div
						key={row.label}
						className="flex items-center justify-between text-sm"
					>
						<span className="text-muted-foreground">
							{row.label}
						</span>
						<span className="font-medium tabular-nums">
							{row.value}
						</span>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
