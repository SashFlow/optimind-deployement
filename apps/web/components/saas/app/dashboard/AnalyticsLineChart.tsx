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
import { useId } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";
import { shortDateLabel } from "./format";

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
	variant,
}: {
	title: string;
	hint?: string;
	data: Array<Record<string, string | number>>;
	series: AnalyticsLineSeries[];
	unavailable?: boolean;
	height?: number;
	yTickFormatter?: (value: number) => string;
	/** Defaults to bar for a single series, line for multiple. */
	variant?: "line" | "bar";
}) {
	const hatchId = useId().replace(/:/g, "");
	const chartVariant = variant ?? (series.length === 1 ? "bar" : "line");

	const chartConfig = Object.fromEntries(
		series.map((s, i) => [
			s.key,
			{
				label: s.label,
				color: s.color ?? `var(--chart-${(i % 5) + 1})`,
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

	const sharedAxes = (
		<>
			<CartesianGrid vertical={false} strokeDasharray="3 3" />
			<XAxis
				dataKey="label"
				tickLine={false}
				axisLine={false}
				tickMargin={8}
				interval="preserveStartEnd"
				minTickGap={24}
			/>
			<YAxis
				tickLine={false}
				axisLine={false}
				tickMargin={8}
				width={48}
				tickFormatter={yTickFormatter}
			/>
			<ChartTooltip
				content={
					<ChartTooltipContent
						labelFormatter={(_, payload) => {
							const date = payload?.[0]?.payload?.date as
								| string
								| undefined;
							return date ?? "";
						}}
					/>
				}
			/>
		</>
	);

	return (
		<Card className="h-full shadow-xs">
			<CardHeader className="space-y-1 pb-2">
				<CardTitle className="text-base font-bold leading-none text-balance">
					{title}
				</CardTitle>
				{hint ? (
					<CardDescription className="text-pretty">
						{hint}
					</CardDescription>
				) : null}
			</CardHeader>
			<CardContent>
				{unavailable ? (
					<p className="text-sm text-muted-foreground">
						Analytics unavailable
					</p>
				) : chartData.length === 0 ? (
					<p className="text-sm text-muted-foreground">No data yet.</p>
				) : chartVariant === "bar" ? (
					<ChartContainer
						config={chartConfig}
						className="aspect-auto w-full"
						style={{ height: `${height}px` }}
					>
						<BarChart
							data={chartData}
							margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
						>
							<defs>
								{series.map((s, index) => {
									const color =
										s.color ??
										`var(--chart-${(index % 5) + 1})`;
									const id = `analytics-hatch-${hatchId}-${s.key}`;
									return (
										<pattern
											key={id}
											id={id}
											width="7"
											height="7"
											patternUnits="userSpaceOnUse"
											patternTransform="rotate(45)"
										>
											<rect
												width="7"
												height="7"
												fill={color}
												fillOpacity={0.22}
											/>
											<rect
												width="3.5"
												height="7"
												fill={color}
											/>
										</pattern>
									);
								})}
							</defs>
							{sharedAxes}
							{series.length > 1 ? (
								<Legend
									verticalAlign="top"
									align="left"
									wrapperStyle={{ paddingBottom: 8 }}
								/>
							) : null}
							{series.map((s) => (
								<Bar
									key={s.key}
									dataKey={s.key}
									name={s.label}
									fill={`url(#analytics-hatch-${hatchId}-${s.key})`}
									radius={[4, 4, 0, 0]}
									maxBarSize={series.length === 1 ? 28 : 18}
									isAnimationActive={false}
								/>
							))}
						</BarChart>
					</ChartContainer>
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
							{sharedAxes}
							{series.length > 1 ? (
								<Legend
									verticalAlign="top"
									align="left"
									wrapperStyle={{ paddingBottom: 8 }}
								/>
							) : null}
							{series.map((s, index) => {
								const color =
									s.color ??
									`var(--chart-${(index % 5) + 1})`;
								return (
									<Line
										key={s.key}
										type="monotone"
										dataKey={s.key}
										name={s.label}
										stroke={color}
										strokeWidth={2.5}
										strokeDasharray={
											index > 0 ? "4 4" : undefined
										}
										dot={false}
										activeDot={{
											r: 5,
											fill: color,
											stroke: "var(--card)",
											strokeWidth: 2,
										}}
										isAnimationActive={false}
									/>
								);
							})}
						</LineChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
