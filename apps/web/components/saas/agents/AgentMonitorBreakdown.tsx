"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@repo/ui/chart";
import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { AgentStats } from "./lib/types";

const BREAKDOWN = [
	{ key: "completed", label: "Completed", color: "var(--chart-2)" },
	{ key: "failed", label: "Failed", color: "var(--chart-1)" },
	{ key: "active", label: "Active", color: "var(--chart-3)" },
	{ key: "other", label: "Other", color: "var(--chart-4)" },
] as const;

export function AgentMonitorBreakdown({ stats }: { stats: AgentStats }) {
	const data = useMemo(() => {
		const other = Math.max(
			0,
			stats.total_sessions -
				stats.completed_sessions -
				stats.failed_sessions -
				stats.active_sessions,
		);
		const values = {
			completed: stats.completed_sessions,
			failed: stats.failed_sessions,
			active: stats.active_sessions,
			other,
		};
		return BREAKDOWN.map((row) => ({
			key: row.key,
			label: row.label,
			value: values[row.key],
			fill: row.color,
		})).filter((row) => row.value > 0);
	}, [stats]);

	const chartConfig = Object.fromEntries(
		BREAKDOWN.map((row) => [
			row.key,
			{ label: row.label, color: row.color },
		]),
	) satisfies ChartConfig;

	const total = data.reduce((sum, row) => sum + row.value, 0);

	return (
		<Card className="h-full rounded-3xl border shadow-sm ring-1 ring-black/5">
			<CardHeader>
				<CardTitle>Breakdown</CardTitle>
				<CardDescription>Session outcomes</CardDescription>
			</CardHeader>
			<CardContent>
				{total <= 0 ? (
					<p className="text-sm text-muted-foreground">
						No sessions yet.
					</p>
				) : (
					<div className="flex flex-col items-center gap-5">
						<div className="relative">
							<ChartContainer
								config={chartConfig}
								className="aspect-square h-[180px] w-[180px] shrink-0"
							>
								<PieChart>
									<ChartTooltip
										content={
											<ChartTooltipContent hideLabel />
										}
									/>
									<Pie
										data={data}
										dataKey="value"
										nameKey="label"
										innerRadius={52}
										outerRadius={78}
										strokeWidth={2}
										paddingAngle={2}
									>
										{data.map((entry) => (
											<Cell
												key={entry.key}
												fill={entry.fill}
											/>
										))}
									</Pie>
								</PieChart>
							</ChartContainer>
							<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
								<span className="text-2xl font-semibold tabular-nums tracking-tight">
									{total}
								</span>
								<span className="text-xs text-muted-foreground">
									sessions
								</span>
							</div>
						</div>
						<ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
							{BREAKDOWN.map((row) => {
								const value =
									data.find((d) => d.key === row.key)
										?.value ?? 0;
								const pct =
									total > 0
										? Math.round((value / total) * 100)
										: 0;
								return (
									<li
										key={row.key}
										className="flex items-center justify-between gap-2"
									>
										<span className="flex min-w-0 items-center gap-2 text-muted-foreground">
											<span
												className="size-2.5 shrink-0 rounded-sm"
												style={{
													background: row.color,
												}}
											/>
											<span className="truncate">
												{row.label}
											</span>
										</span>
										<span className="shrink-0 font-medium tabular-nums">
											{value}
											<span className="ml-1.5 text-xs font-normal text-muted-foreground">
												{pct}%
											</span>
										</span>
									</li>
								);
							})}
						</ul>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
