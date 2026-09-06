"use client";

import { Card, CardContent, CardHeader } from "@repo/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@repo/ui/chart";
import { Cell, Pie, PieChart } from "recharts";
import type {
	AnalyticsLabelMinutes,
	AnalyticsLabelPct,
} from "@/services/api/types";

import { MetricHelpTitle } from "./MetricHelpTitle";

const CHART_COLORS = [
	"var(--color-chart-1)",
	"var(--color-chart-2)",
	"var(--color-chart-3)",
	"var(--color-chart-4)",
	"var(--color-chart-5)",
];

export function DonutBreakdownCard({
	title,
	hint,
	items,
	unavailable,
	mode = "pct",
}: {
	title: string;
	hint?: string;
	items: AnalyticsLabelPct[] | AnalyticsLabelMinutes[];
	unavailable?: boolean;
	mode?: "pct" | "minutes";
}) {
	const data = items.map((item, index) => {
		const value =
			mode === "minutes"
				? (item as AnalyticsLabelMinutes).minutes
				: (item as AnalyticsLabelPct).pct;
		return {
			label: item.label,
			value,
			fill: CHART_COLORS[index % CHART_COLORS.length],
		};
	});

	const chartConfig = Object.fromEntries(
		data.map((d) => [d.label, { label: d.label, color: d.fill }]),
	) satisfies ChartConfig;

	const total = data.reduce((sum, d) => sum + d.value, 0);

	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<MetricHelpTitle title={title} hint={hint} />
			</CardHeader>
			<CardContent>
				{unavailable ? (
					<p className="text-sm text-muted-foreground">
						Analytics unavailable
					</p>
				) : total <= 0 ? (
					<p className="text-sm text-muted-foreground">
						No data yet.
					</p>
				) : (
					<div className="flex items-center gap-4">
						<ChartContainer
							config={chartConfig}
							className="aspect-square h-[120px] w-[120px] shrink-0"
						>
							<PieChart>
								<ChartTooltip
									content={<ChartTooltipContent hideLabel />}
								/>
								<Pie
									data={data}
									dataKey="value"
									nameKey="label"
									innerRadius={32}
									outerRadius={52}
									strokeWidth={2}
								>
									{data.map((entry) => (
										<Cell
											key={entry.label}
											fill={entry.fill}
										/>
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
						<ul className="min-w-0 flex-1 space-y-1.5 text-sm">
							{data.map((entry) => (
								<li
									key={entry.label}
									className="flex items-center justify-between gap-2"
								>
									<span className="flex min-w-0 items-center gap-2 text-muted-foreground">
										<span
											className="size-2 shrink-0 rounded-sm"
											style={{ background: entry.fill }}
										/>
										<span className="truncate">
											{entry.label}
										</span>
									</span>
									<span className="shrink-0 font-medium tabular-nums">
										{mode === "minutes"
											? `${Math.round(entry.value)} mins`
											: `${entry.value.toFixed(1)}%`}
									</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
