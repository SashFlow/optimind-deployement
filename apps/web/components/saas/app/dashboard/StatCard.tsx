"use client";

import { Card, CardContent } from "@repo/ui/card";
import { type ChartConfig, ChartContainer } from "@repo/ui/chart";
import { cn } from "@repo/ui/utils";
import { Area, AreaChart } from "recharts";

export type SparklinePoint = {
	value: number;
};

const sparklineConfig = {
	value: {
		label: "Trend",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function computeDeltaPct(values: number[]): number | null {
	if (values.length < 4) return null;
	const mid = Math.floor(values.length / 2);
	const first = values.slice(0, mid);
	const second = values.slice(mid);
	const avg = (arr: number[]) =>
		arr.reduce((sum, n) => sum + n, 0) / Math.max(arr.length, 1);
	const a = avg(first);
	const b = avg(second);
	if (a === 0) return b === 0 ? 0 : 100;
	return ((b - a) / Math.abs(a)) * 100;
}

export function StatCard({
	title,
	value,
	icon: Icon,
	description,
	sparkline,
	deltaPct,
	className,
}: {
	title: string;
	value: string | number;
	icon: React.ComponentType<{ className?: string }>;
	description?: string;
	sparkline?: SparklinePoint[];
	deltaPct?: number | null;
	className?: string;
}) {
	const showDelta = typeof deltaPct === "number" && Number.isFinite(deltaPct);
	const positive = (deltaPct ?? 0) >= 0;
	const gradientId = `stat-spark-${title.replace(/\s+/g, "-").toLowerCase()}`;

	return (
		<Card className={cn("h-full", className)}>
			<CardContent className="relative pt-1">
				<div className="flex items-start justify-between gap-3">
					<div className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
						<Icon className="size-4" />
					</div>
					{sparkline && sparkline.length > 1 ? (
						<div className="h-12 w-24 shrink-0">
							<ChartContainer
								config={sparklineConfig}
								className="aspect-auto h-full w-full"
							>
								<AreaChart
									data={sparkline}
									margin={{
										top: 4,
										right: 0,
										left: 0,
										bottom: 0,
									}}
								>
									<defs>
										<linearGradient
											id={gradientId}
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="0%"
												stopColor="var(--chart-1)"
												stopOpacity={0.45}
											/>
											<stop
												offset="100%"
												stopColor="var(--chart-3)"
												stopOpacity={0.05}
											/>
										</linearGradient>
									</defs>
									<Area
										type="monotone"
										dataKey="value"
										stroke="var(--chart-1)"
										strokeWidth={2}
										fill={`url(#${gradientId})`}
										isAnimationActive={false}
									/>
								</AreaChart>
							</ChartContainer>
						</div>
					) : null}
				</div>

				<div className="mt-4 space-y-1">
					<p className="text-sm text-muted-foreground">{title}</p>
					<div className="flex items-end gap-2">
						<div className="text-2xl font-semibold tracking-tight tabular-nums">
							{value}
						</div>
						{showDelta ? (
							<span
								className={cn(
									"mb-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
									positive
										? "bg-emerald-500/10 text-emerald-600"
										: "bg-rose-500/10 text-rose-600",
								)}
							>
								{positive ? "+" : ""}
								{deltaPct!.toFixed(1)}%
							</span>
						) : null}
					</div>
					{description ? (
						<p className="text-xs text-muted-foreground">
							{description}
						</p>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}
