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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { AgentDailyStats } from "@/services/api/types";

const chartConfig = {
	count: { label: "Sessions", color: "var(--chart-3)" },
	completed: { label: "Completed", color: "var(--chart-2)" },
	failed: { label: "Failed", color: "var(--chart-1)" },
} satisfies ChartConfig;

const METRIC_OPTIONS = [
	{ value: "count", label: "Sessions" },
	{ value: "completed", label: "Completed" },
	{ value: "failed", label: "Failed" },
] as const;

type MetricKey = (typeof METRIC_OPTIONS)[number]["value"];

export function ActivityChartCard({ daily }: { daily: AgentDailyStats[] }) {
	const [metric, setMetric] = useState<MetricKey>("count");
	const hatchId = useId().replace(/:/g, "");

	const data = useMemo(
		() =>
			daily.map((d) => ({
				...d,
				label: d.date.slice(5),
			})),
		[daily],
	);

	const fillColor = `var(--color-${metric})`;

	return (
		<Card className="h-full shadow-xs">
			<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
				<div className="space-y-1">
					<CardTitle className="text-base font-bold leading-none">
						User activity
					</CardTitle>
					<CardDescription>
						Daily session volume for the selected period
					</CardDescription>
				</div>
				<Select
					value={metric}
					onValueChange={(value) => setMetric(value as MetricKey)}
				>
					<SelectTrigger className="h-9 w-[140px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent align="end">
						{METRIC_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No sessions yet.
					</p>
				) : (
					<ChartContainer
						config={chartConfig}
						className="aspect-auto h-[280px] w-full"
					>
						<BarChart
							data={data}
							margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
						>
							<defs>
								<pattern
									id={`activity-hatch-${hatchId}`}
									width="7"
									height="7"
									patternUnits="userSpaceOnUse"
									patternTransform="rotate(45)"
								>
									<rect
										width="7"
										height="7"
										fill={fillColor}
										fillOpacity={0.22}
									/>
									<rect
										width="3.5"
										height="7"
										fill={fillColor}
									/>
								</pattern>
							</defs>
							<CartesianGrid
								vertical={false}
								strokeDasharray="3 3"
							/>
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								interval="preserveStartEnd"
								minTickGap={24}
							/>
							<YAxis
								allowDecimals={false}
								tickLine={false}
								axisLine={false}
								width={36}
								tickMargin={4}
							/>
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(_, payload) => {
											const date = payload?.[0]?.payload
												?.date as string | undefined;
											return date ?? "";
										}}
									/>
								}
							/>
							<Bar
								dataKey={metric}
								fill={`url(#activity-hatch-${hatchId})`}
								radius={[4, 4, 0, 0]}
								maxBarSize={28}
							/>
						</BarChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
