"use client";

import { Card, CardContent, CardHeader } from "@repo/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@repo/ui/chart";
import { Cell, Pie, PieChart } from "recharts";

import { MetricHelpTitle } from "./MetricHelpTitle";

const GAUGE_COLORS = [
	"var(--chart-1)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-2)",
	"var(--chart-5)",
];

function formatLabel(label: string) {
	return label.replaceAll("_", " ").toLowerCase();
}

export function GaugeBreakdownCard({
	title,
	hint,
	items,
	centerLabel = "",
}: {
	title: string;
	hint?: string;
	items: Record<string, number>;
	centerLabel?: string;
}) {
	const entries = Object.entries(items)
		.filter(([, count]) => count > 0)
		.sort((a, b) => b[1] - a[1])
		.map(([label, count], index) => ({
			label,
			count,
			fill: GAUGE_COLORS[index % GAUGE_COLORS.length],
		}));

	const total = entries.reduce((sum, entry) => sum + entry.count, 0);

	const chartConfig = Object.fromEntries(
		entries.map((entry) => [
			entry.label,
			{ label: entry.label, color: entry.fill },
		]),
	) satisfies ChartConfig;

	return (
		<Card className="h-full shadow-xs">
			<CardHeader className="pb-2">
				<MetricHelpTitle title={title} hint={hint} />
			</CardHeader>
			<CardContent>
				{entries.length === 0 || total <= 0 ? (
					<p className="text-sm text-muted-foreground">
						No sessions yet.
					</p>
				) : (
					<div className="space-y-5">
						<div className="relative mx-auto w-full max-w-[420px]">
							<ChartContainer
								config={chartConfig}
								className="mx-auto aspect-[2.4/1] h-[148px] w-full"
							>
								<PieChart>
									<ChartTooltip
										content={
											<ChartTooltipContent hideLabel />
										}
									/>
									<Pie
										data={entries}
										dataKey="count"
										nameKey="label"
										startAngle={180}
										endAngle={0}
										cx="50%"
										cy="100%"
										innerRadius="62%"
										outerRadius="98%"
										paddingAngle={2}
										cornerRadius={8}
										strokeWidth={0}
									>
										{entries.map((entry) => (
											<Cell
												key={entry.label}
												fill={entry.fill}
											/>
										))}
									</Pie>
								</PieChart>
							</ChartContainer>
							<div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center pb-0.5 text-center">
								<span className="text-[11px] text-muted-foreground">
									{centerLabel}
								</span>
								<span className="text-2xl font-semibold tabular-nums tracking-tight">
									{total.toLocaleString()}
								</span>
							</div>
						</div>

						<div
							className="grid divide-x divide-border/60"
							style={{
								gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))`,
							}}
						>
							{entries.map((entry) => (
								<div
									key={entry.label}
									className="flex flex-col items-center gap-1.5 px-2 text-center first:pl-0 last:pr-0"
								>
									<span
										className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-muted/40"
										aria-hidden
									>
										<span
											className="size-2.5 rounded-full"
											style={{ background: entry.fill }}
										/>
									</span>
									<span className="truncate text-xs capitalize text-muted-foreground">
										{formatLabel(entry.label)}
									</span>
									<span className="text-sm font-semibold tabular-nums tracking-tight">
										{entry.count.toLocaleString()}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
