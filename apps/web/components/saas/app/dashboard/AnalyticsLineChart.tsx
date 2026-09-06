"use client";

import { Card, CardContent, CardHeader } from "@repo/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@repo/ui/chart";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import { shortDateLabel } from "./format";
import { MetricHelpTitle } from "./MetricHelpTitle";

export type AnalyticsLineSeries = {
	key: string;
	label: string;
	color?: string;
};

export function AnalyticsLineChart({
	title,
	hint,
	data,
	series,
	unavailable,
	height = 280,
	yTickFormatter,
}: {
	title: string;
	hint?: string;
	data: Array<Record<string, string | number>>;
	series: AnalyticsLineSeries[];
	unavailable?: boolean;
	height?: number;
	yTickFormatter?: (value: number) => string;
}) {
	const chartConfig = Object.fromEntries(
		series.map((s, i) => [
			s.key,
			{
				label: s.label,
				color: s.color ?? `var(--color-chart-${(i % 5) + 1})`,
			},
		]),
	) satisfies ChartConfig;

	const chartData = data.map((row) => ({
		...row,
		label:
			typeof row.date === "string"
				? shortDateLabel(row.date)
				: String(row.label ?? ""),
	}));

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
				) : chartData.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No data yet.
					</p>
				) : (
					<ChartContainer
						config={chartConfig}
						className="aspect-auto w-full"
						style={{ height: `${height}px` }}
					>
						<LineChart
							data={chartData}
							margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
						>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								interval="preserveStartEnd"
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								width={48}
								tickFormatter={yTickFormatter}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							{series.length > 1 ? (
								<Legend
									verticalAlign="top"
									align="left"
									wrapperStyle={{ paddingBottom: 8 }}
								/>
							) : null}
							{series.map((s) => (
								<Line
									key={s.key}
									type="monotone"
									dataKey={s.key}
									name={s.label}
									stroke={`var(--color-${s.key})`}
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 3 }}
								/>
							))}
						</LineChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
