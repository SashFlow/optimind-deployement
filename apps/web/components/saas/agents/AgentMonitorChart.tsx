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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { AgentStats } from "./lib/types";

const chartConfig = {
	count: { label: "Sessions", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function AgentMonitorChart({ stats }: { stats: AgentStats }) {
	const data = useMemo(
		() =>
			stats.daily.map((day) => ({
				...day,
				label: day.date.slice(5),
			})),
		[stats.daily],
	);

	const hasActivity = data.some((day) => day.count > 0);

	return (
		<Card className="h-full rounded-3xl border shadow-sm ring-1 ring-black/5">
			<CardHeader>
				<CardTitle>Sessions over time</CardTitle>
				<CardDescription>
					Daily session volume for the last {data.length} days
				</CardDescription>
			</CardHeader>
			<CardContent>
				{!hasActivity ? (
					<div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
						No sessions in this period yet.
					</div>
				) : (
					<ChartContainer
						config={chartConfig}
						className="aspect-auto h-[280px] w-full"
					>
						<BarChart
							data={data}
							margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
						>
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
								dataKey="count"
								fill="var(--color-count)"
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
