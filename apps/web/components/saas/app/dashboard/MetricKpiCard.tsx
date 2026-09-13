"use client";

import { Card, CardContent } from "@repo/ui/card";
import { type ChartConfig, ChartContainer } from "@repo/ui/chart";
import { cn } from "@repo/ui/utils";
import { ArrowDownIcon, ArrowUpIcon, type LucideIcon } from "lucide-react";
import { useId } from "react";
import { Area, AreaChart } from "recharts";

export type MetricSparklinePoint = {
	value: number;
};

export type MetricKpiTone = "primary" | "secondary" | "success" | "destructive";

type MetricKpiCardProps = {
	title: string;
	value: string;
	icon: LucideIcon;
	className?: string;
	valueClassName?: string;
	/** Tighter padding and typography for side stacks. */
	compact?: boolean;
	/** Semantic color for icon wash, progress, and sparkline. */
	tone?: MetricKpiTone;
	deltaPct?: number | null;
	/** When true, a drop is treated as positive (e.g. latency, cost). */
	invertDelta?: boolean;
	/** Muted line under the value (e.g. "23 urgent at risk"). */
	detail?: string;
	/** Divider + single muted footer line (e.g. "+76 added · 4 warehouses"). */
	footerText?: string;
	/** Left/right footer row. */
	footerStat?: {
		label: string;
		value: string;
		tone?: "default" | "danger";
	};
	/** Shown beside a sparkline, e.g. "vs previous 30 days". */
	comparisonLabel?: string;
	sparkline?: MetricSparklinePoint[];
	/** 0–1 progress fill for the bottom bar. */
	progress?: number | null;
};

const TONE_ICON: Record<MetricKpiTone, string> = {
	primary: "bg-primary/10 text-primary",
	secondary: "bg-secondary/10 text-secondary",
	success: "bg-success/10 text-success",
	destructive: "bg-destructive/10 text-destructive",
};

const TONE_PROGRESS: Record<MetricKpiTone, string> = {
	primary: "bg-primary",
	secondary: "bg-secondary",
	success: "bg-success",
	destructive: "bg-destructive",
};

const TONE_STROKE: Record<MetricKpiTone, string> = {
	primary: "var(--primary)",
	secondary: "var(--secondary)",
	success: "var(--success)",
	destructive: "var(--destructive)",
};

function formatDelta(deltaPct: number) {
	const abs = Math.abs(deltaPct).toFixed(1);
	return deltaPct >= 0 ? `+${abs}%` : `-${abs}%`;
}

function MiniSparkline({
	data,
	tone = "primary",
	className,
}: {
	data: MetricSparklinePoint[];
	tone?: MetricKpiTone;
	className?: string;
}) {
	const reactId = useId();
	const gradientId = `metric-kpi-${reactId.replace(/:/g, "")}`;
	const stroke = TONE_STROKE[tone];
	const config = {
		value: { label: "Trend", color: stroke },
	} satisfies ChartConfig;

	return (
		<div className={cn("h-10 w-24 shrink-0", className)}>
			<ChartContainer
				config={config}
				className="aspect-auto h-full w-full"
			>
				<AreaChart
					data={data}
					margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
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
								stopColor={stroke}
								stopOpacity={0.35}
							/>
							<stop
								offset="100%"
								stopColor={stroke}
								stopOpacity={0.02}
							/>
						</linearGradient>
					</defs>
					<Area
						type="monotone"
						dataKey="value"
						stroke={stroke}
						strokeWidth={2}
						fill={`url(#${gradientId})`}
						isAnimationActive={false}
						dot={false}
						activeDot={false}
					/>
				</AreaChart>
			</ChartContainer>
		</div>
	);
}

export function MetricKpiCard({
	title,
	value,
	icon: Icon,
	className,
	valueClassName,
	compact = false,
	tone = "primary",
	deltaPct,
	invertDelta = false,
	detail,
	footerText,
	footerStat,
	comparisonLabel,
	sparkline,
	progress,
}: MetricKpiCardProps) {
	const showDelta = typeof deltaPct === "number" && Number.isFinite(deltaPct);
	const rising = showDelta ? deltaPct! >= 0 : false;
	const isFavorable = showDelta ? (invertDelta ? !rising : rising) : false;
	const showSparkline = (sparkline?.length ?? 0) > 1;
	const showProgress =
		typeof progress === "number" && Number.isFinite(progress);
	const progressPct = showProgress
		? Math.max(0, Math.min(100, progress! * 100))
		: 0;
	const hasFooter =
		Boolean(footerText) ||
		Boolean(footerStat) ||
		showSparkline ||
		showProgress;

	return (
		<Card className={cn("h-full shadow-xs", className)}>
			<CardContent
				className={cn(
					"flex h-full flex-col",
					compact ? "gap-2 p-3.5" : "gap-4 p-5",
				)}
			>
				<div className="flex items-start gap-3">
					<div
						className={cn(
							"flex shrink-0 items-center justify-center rounded-full",
							compact ? "size-8" : "size-10",
							TONE_ICON[tone],
						)}
					>
						<Icon
							className={compact ? "size-3.5" : "size-4"}
							aria-hidden
						/>
					</div>
					<div className="min-w-0 flex-1 space-y-1">
						<p className="text-sm text-muted-foreground text-pretty">
							{title}
						</p>
						<div className="flex flex-wrap items-center gap-2">
							<p
								className={cn(
									"font-semibold tracking-tight tabular-nums text-foreground",
									compact ? "text-2xl" : "text-3xl",
									valueClassName,
								)}
							>
								{value}
							</p>
							{showDelta ? (
								<span
									className={cn(
										"inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
										isFavorable
											? "bg-success/10 text-success"
											: "bg-destructive/10 text-destructive",
									)}
								>
									{rising ? (
										<ArrowUpIcon
											className="size-3"
											aria-hidden
										/>
									) : (
										<ArrowDownIcon
											className="size-3"
											aria-hidden
										/>
									)}
									{formatDelta(deltaPct!)}
								</span>
							) : null}
						</div>
						{detail ? (
							<p className="text-sm text-muted-foreground text-pretty">
								{detail}
							</p>
						) : null}
					</div>
				</div>

				{hasFooter ? (
					<div className="mt-auto space-y-3">
						{footerText || footerStat ? (
							<div className="border-t border-border" />
						) : null}

						{footerText ? (
							<p className="text-sm text-muted-foreground text-pretty">
								{footerText}
							</p>
						) : null}

						{footerStat ? (
							<div className="flex items-center justify-between gap-3 text-sm">
								<span className="text-muted-foreground text-pretty">
									{footerStat.label}
								</span>
								<span
									className={cn(
										"shrink-0 font-semibold tabular-nums",
										footerStat.tone === "danger"
											? "text-destructive"
											: "text-foreground",
									)}
								>
									{footerStat.value}
								</span>
							</div>
						) : null}

						{showSparkline ? (
							<div className="flex items-end justify-between gap-3">
								{comparisonLabel ? (
									<p className="text-sm text-muted-foreground text-pretty">
										{comparisonLabel}
									</p>
								) : (
									<span />
								)}
								<MiniSparkline data={sparkline!} tone={tone} />
							</div>
						) : null}

						{showProgress ? (
							<div
								className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
								role="progressbar"
								aria-valuenow={Math.round(progressPct)}
								aria-valuemin={0}
								aria-valuemax={100}
							>
								<div
									className={cn(
										"h-full rounded-full",
										TONE_PROGRESS[tone],
									)}
									style={{ width: `${progressPct}%` }}
								/>
							</div>
						) : null}
					</div>
				) : (
					<div className="mt-auto" />
				)}
			</CardContent>
		</Card>
	);
}
