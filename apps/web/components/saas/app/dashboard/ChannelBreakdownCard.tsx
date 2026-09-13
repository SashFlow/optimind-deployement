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

import { MetricHelpTitle } from "./MetricHelpTitle";

const BREAKDOWN_COLORS = [
	"var(--chart-1)",
	"var(--chart-3)",
	"var(--chart-2)",
	"var(--chart-4)",
	"var(--chart-5)",
];

export function ChannelBreakdownCard({
	byChannel,
	title = "By channel",
	hint,
	centerLabel = "Sessions",
}: {
	byChannel: Record<string, number>;
	title?: string;
	hint?: string;
	centerLabel?: string;
}) {
	const entries = Object.entries(byChannel)
		.sort((a, b) => b[1] - a[1])
		.map(([channel, count], index) => ({
			channel,
			count,
			fill: BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length],
		}));

	const total = entries.reduce((sum, entry) => sum + entry.count, 0);

	const chartConfig = Object.fromEntries(
		entries.map((entry) => [
			entry.channel,
			{ label: entry.channel, color: entry.fill },
		]),
	) satisfies ChartConfig;

	return (
		<Card className="h-full shadow-xs">
			<CardHeader className="pb-2">
				{hint ? (
					<MetricHelpTitle title={title} hint={hint} />
				) : (
					<CardTitle className="text-base font-bold leading-none">
						{title}
					</CardTitle>
				)}
			</CardHeader>
			<CardContent>
				{entries.length === 0 || total <= 0 ? (
					<p className="text-sm text-muted-foreground">
						No sessions yet.
					</p>
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
										data={entries}
										dataKey="count"
										nameKey="channel"
										innerRadius={46}
										outerRadius={68}
										paddingAngle={3}
										cornerRadius={4}
										strokeWidth={0}
									>
										{entries.map((entry) => (
											<Cell
												key={entry.channel}
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
									{total.toLocaleString()}
								</span>
							</div>
						</div>

						<ul className="min-w-0 flex-1">
							{entries.map((entry, index) => {
								const pct =
									total > 0
										? Math.round((entry.count / total) * 100)
										: 0;

								return (
									<li
										key={entry.channel}
										className={
											index < entries.length - 1
												? "border-b border-border/60"
												: undefined
										}
									>
										<div className="flex items-center gap-2 py-2.5 text-sm">
											<span
												className="size-2 shrink-0 rounded-full"
												style={{
													background: entry.fill,
												}}
											/>
											<span className="min-w-0 flex-1 truncate capitalize">
												{entry.channel
													.replaceAll("_", " ")
													.toLowerCase()}
											</span>
											<span className="shrink-0 font-semibold tabular-nums">
												{entry.count.toLocaleString()}
											</span>
											<span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
												{pct}%
											</span>
										</div>
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
