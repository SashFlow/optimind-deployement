"use client";

import { Card, CardContent } from "@repo/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@repo/ui/chart";
import { cn } from "@repo/ui/utils";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	XAxis,
} from "recharts";

export type SparklinePoint = {
	value: number;
	label?: string;
};

export type StatCardVariant =
	| "area"
	| "bars"
	| "line"
	| "dotted-line"
	| "donut";

const chartConfig = {
	value: {
		label: "Value",
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

function formatDelta(deltaPct: number) {
	const positive = deltaPct >= 0;
	return `${positive ? "+" : ""}${deltaPct.toFixed(1)}%`;
}

function StatMiniChart({
	variant,
	sparkline,
	color,
	progress,
	donutLabel,
	donutCaption,
	gradientId,
}: {
	variant: StatCardVariant;
	sparkline: SparklinePoint[];
	color: string;
	progress?: number;
	donutLabel?: string;
	donutCaption?: string;
	gradientId: string;
}) {
	if (variant === "donut") {
		const pct = Math.max(0, Math.min(1, progress ?? 0));
		const data = [
			{ name: "value", value: pct },
			{ name: "rest", value: Math.max(0.0001, 1 - pct) },
		];

		return (
			<div className="relative mx-auto flex h-[100px] w-[100px] items-center justify-center">
				<ChartContainer
					config={chartConfig}
					className="aspect-square h-full w-full"
				>
					<PieChart>
						<Pie
							data={data}
							dataKey="value"
							nameKey="name"
							innerRadius={34}
							outerRadius={46}
							startAngle={90}
							endAngle={-270}
							strokeWidth={0}
							isAnimationActive={false}
						>
							<Cell fill={color} />
							<Cell fill="var(--muted)" />
						</Pie>
					</PieChart>
				</ChartContainer>
				{donutLabel ? (
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center">
						<span className="text-base font-bold tabular-nums leading-none">
							{donutLabel}
						</span>
						{donutCaption ? (
							<span className="text-[10px] leading-none text-muted-foreground">
								{donutCaption}
							</span>
						) : null}
					</div>
				) : null}
			</div>
		);
	}

	if (!sparkline.length) {
		return <div className="h-[88px] w-full" />;
	}

	if (variant === "bars") {
		const max = Math.max(...sparkline.map((p) => p.value), 1);
		const points =
			sparkline.length > 10 ? sparkline.slice(-10) : sparkline;

		return (
			<div className="flex h-[88px] w-full items-end justify-between gap-1.5 px-5">
				{points.map((point, index) => {
					const fillHeight = Math.max(
						8,
						Math.round((point.value / max) * 100),
					);
					return (
						<div
							key={`${point.label ?? point.value}-${index}`}
							className="flex h-full min-w-0 flex-1 items-end"
						>
							<div className="relative h-full w-full overflow-hidden rounded-full bg-muted">
								<div
									className="absolute inset-x-0 bottom-0 rounded-full"
									style={{
										height: `${fillHeight}%`,
										backgroundColor: color,
									}}
								/>
							</div>
						</div>
					);
				})}
			</div>
		);
	}

	if (variant === "line" || variant === "dotted-line") {
		const isDotted = variant === "dotted-line";

		return (
			<div className="h-[100px] w-full">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-full w-full justify-start"
				>
					<LineChart
						data={sparkline}
						margin={{ top: 12, right: 0, left: 0, bottom: 4 }}
					>
						<CartesianGrid
							vertical
							horizontal={false}
							stroke="var(--border)"
							strokeDasharray="2 4"
						/>
						<XAxis
							dataKey="label"
							type="category"
							scale="point"
							padding={{ left: 0, right: 0 }}
							hide
						/>
						<ChartTooltip
							cursor={{
								stroke: "var(--muted-foreground)",
								strokeWidth: 1,
								strokeDasharray: "3 3",
							}}
							content={
								<ChartTooltipContent
									indicator="dot"
									labelKey="label"
								/>
							}
						/>
						<Line
							type="monotone"
							dataKey="value"
							stroke={color}
							strokeWidth={2.5}
							strokeDasharray={isDotted ? "4 4" : undefined}
							dot={
								isDotted
									? false
									: {
											r: 3.5,
											fill: color,
											strokeWidth: 0,
										}
							}
							activeDot={{
								r: 5,
								fill: color,
								stroke: "var(--card)",
								strokeWidth: 2,
							}}
							isAnimationActive={false}
						/>
					</LineChart>
				</ChartContainer>
			</div>
		);
	}

	return (
		<div className="h-[100px] w-full">
			<ChartContainer
				config={chartConfig}
				className="aspect-auto h-full w-full justify-start"
			>
				<AreaChart
					data={sparkline}
					margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
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
								stopColor={color}
								stopOpacity={0.35}
							/>
							<stop
								offset="100%"
								stopColor={color}
								stopOpacity={0.02}
							/>
						</linearGradient>
					</defs>
					<XAxis
						dataKey="label"
						type="category"
						scale="point"
						padding={{ left: 0, right: 0 }}
						hide
					/>
					<ChartTooltip
						cursor={{
							stroke: "var(--muted-foreground)",
							strokeWidth: 1,
							strokeDasharray: "3 3",
						}}
						content={
							<ChartTooltipContent
								indicator="dot"
								labelKey="label"
							/>
						}
					/>
					<Area
						type="monotone"
						dataKey="value"
						stroke={color}
						strokeWidth={2.5}
						fill={`url(#${gradientId})`}
						isAnimationActive={false}
						activeDot={{
							r: 5,
							fill: color,
							stroke: "var(--card)",
							strokeWidth: 2,
						}}
					/>
				</AreaChart>
			</ChartContainer>
		</div>
	);
}

export function StatCard({
	title,
	value,
	subtitle,
	sparkline,
	deltaPct,
	variant = "area",
	color = "var(--chart-1)",
	progress,
	donutLabel,
	donutCaption,
	className,
}: {
	title: string;
	value: string | number;
	subtitle?: string;
	sparkline?: SparklinePoint[];
	deltaPct?: number | null;
	variant?: StatCardVariant;
	color?: string;
	progress?: number;
	donutLabel?: string;
	donutCaption?: string;
	className?: string;
}) {
	const showDelta = typeof deltaPct === "number" && Number.isFinite(deltaPct);
	const gradientId = `stat-spark-${title.replace(/\s+/g, "-").toLowerCase()}`;
	const points = sparkline ?? [];
	const isFullBleedChart =
		variant === "line" ||
		variant === "dotted-line" ||
		variant === "area";

	return (
		<Card className={cn("h-full overflow-hidden shadow-xs", className)}>
			<CardContent className="flex h-full flex-col p-0">
				<div className="space-y-0.5 px-5 pt-5">
					<p className="text-base font-bold leading-none text-balance">
						{title}
					</p>
					{subtitle ? (
						<p className="text-sm text-muted-foreground text-pretty">
							{subtitle}
						</p>
					) : null}
				</div>

				<div
					className={cn(
						"flex min-h-[100px] flex-1 items-center",
						isFullBleedChart ? "w-full" : "px-5",
					)}
				>
					<StatMiniChart
						variant={variant}
						sparkline={points}
						color={color}
						progress={progress}
						donutLabel={donutLabel}
						donutCaption={donutCaption}
						gradientId={gradientId}
					/>
				</div>

				<div className="flex items-end justify-between gap-3 px-5 pb-5 pt-2">
					<div className="text-3xl font-bold tracking-tight tabular-nums">
						{value}
					</div>
					{showDelta ? (
						<span className="pb-1 text-sm font-medium tabular-nums text-muted-foreground">
							{formatDelta(deltaPct!)}
						</span>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}
