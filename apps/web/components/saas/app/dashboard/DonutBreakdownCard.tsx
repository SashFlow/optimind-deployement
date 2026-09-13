"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/card";
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
	"var(--chart-1)",
	"var(--chart-3)",
	"var(--chart-2)",
	"var(--chart-4)",
	"var(--chart-5)",
];

export function DonutBreakdownCard({
	title,
	hint,
	items,
	unavailable,
	mode = "pct",
	centerLabel = "Total",
}: {
	title: string;
	hint?: string;
	items: AnalyticsLabelPct[] | AnalyticsLabelMinutes[];
	unavailable?: boolean;
	mode?: "pct" | "minutes";
	centerLabel?: string;
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
		<Card className="h-full shadow-xs">
			<CardHeader className="pb-2">
				{hint ? (
					<MetricHelpTitle title={title} hint={hint} />
				) : (
					<CardTitle>{title}</CardTitle>
				)}
			</CardHeader>
			<CardContent>
				{unavailable ? (
					<p className="text-sm text-muted-foreground">
						Analytics unavailable
					</p>
				) : total <= 0 ? (
					<p className="text-sm text-muted-foreground">No data yet.</p>
				) : (
					<div className="flex items-center gap-5">
						<div className="relative shrink-0">
							<ChartContainer
								config={chartConfig}
								className="aspect-square h-[148px] w-[148px]"
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
										innerRadius={46}
										outerRadius={68}
										paddingAngle={3}
										cornerRadius={4}
										strokeWidth={0}
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
							<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
								<span className="text-[11px] text-muted-foreground">
									{centerLabel}
								</span>
								<span className="text-lg font-semibold tabular-nums tracking-tight">
									{mode === "minutes"
										? `${Math.round(total)}`
										: `${total.toFixed(0)}%`}
								</span>
							</div>
						</div>

						<ul className="min-w-0 flex-1">
							{data.map((entry, index) => (
								<li
									key={entry.label}
									className={
										index < data.length - 1
											? "border-b border-border/60"
											: undefined
									}
								>
									<div className="flex items-center gap-2 py-2.5 text-sm">
										<span
											className="size-2 shrink-0 rounded-full"
											style={{ background: entry.fill }}
										/>
										<span className="min-w-0 flex-1 truncate">
											{entry.label}
										</span>
										<span className="shrink-0 font-semibold tabular-nums">
											{mode === "minutes"
												? `${Math.round(entry.value)}`
												: entry.value.toFixed(1)}
										</span>
										<span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">
											{mode === "minutes"
												? "mins"
												: "%"}
										</span>
									</div>
								</li>
							))}
						</ul>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
