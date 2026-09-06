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
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { AgentDailyStats } from "@/services/api/types";

const chartConfig = {
	count: { label: "Sessions", color: "var(--chart-3)" },
	completed: { label: "Completed", color: "var(--chart-2)" },
	failed: { label: "Failed", color: "var(--chart-1)" },
} satisfies ChartConfig;

type MetricKey = "count" | "completed" | "failed";

export function ActivityChartCard({ daily }: { daily: AgentDailyStats[] }) {
	const [metric, setMetric] = useState<MetricKey>("count");

	const data = useMemo(
		() =>
			daily.map((d) => ({
				...d,
				label: d.date.slice(5),
			})),
		[daily],
	);

	return (
		<Card className="h-full">
			<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
				<div className="space-y-1">
					<CardTitle>User activity</CardTitle>
					<CardDescription>
						Daily session volume for the selected period
					</CardDescription>
				</div>
				<Tabs
					value={metric}
					onValueChange={(value) => setMetric(value as MetricKey)}
				>
					<TabsList className="h-9 rounded-full bg-muted/80 p-1">
						<TabsTrigger
							value="count"
							className="rounded-full px-3"
						>
							Sessions
						</TabsTrigger>
						<TabsTrigger
							value="completed"
							className="rounded-full px-3"
						>
							Completed
						</TabsTrigger>
						<TabsTrigger
							value="failed"
							className="rounded-full px-3"
						>
							Failed
						</TabsTrigger>
					</TabsList>
				</Tabs>
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
						<AreaChart
							data={data}
							margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
						>
							<defs>
								<linearGradient
									id="activity-fill"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										stopColor="var(--chart-1)"
										stopOpacity={0.4}
									/>
									<stop
										offset="100%"
										stopColor="var(--chart-3)"
										stopOpacity={0.05}
									/>
								</linearGradient>
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
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								width={36}
								tickMargin={4}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							<Area
								type="monotone"
								dataKey={metric}
								stroke={`var(--color-${metric})`}
								strokeWidth={2.5}
								fill="url(#activity-fill)"
							/>
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
