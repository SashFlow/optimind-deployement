"use client";

import { Card, CardContent } from "@repo/ui/card";
import { type ChartConfig, ChartContainer } from "@repo/ui/chart";
import { cn } from "@repo/ui/utils";
import { useId } from "react";
import { Area, AreaChart } from "recharts";

export type KpiTone = "accent" | "positive" | "negative";

export type SparklinePoint = {
	value: number;
};

export type KpiCardProps = {
	variant: "compact" | "insight";
	title: string;
	value: string;
	sparkline?: SparklinePoint[];
	tone?: KpiTone;
	className?: string;

	/** compact */
	icon?: React.ComponentType<{ className?: string }>;
	subtitle?: string;
	valuePrefix?: string;
	deltaLabel?: string;

	/** insight */
	status?: { emphasis: string; label: string };
	change?: { value: string; period?: string };
	footer?: { label: string; items: string[] };
};

const TONE_STROKE: Record<KpiTone, string> = {
	accent: "var(--chart-1)",
	positive: "rgb(16 185 129)", // emerald-500
	negative: "rgb(244 63 94)", // rose-500
};

const TONE_TEXT: Record<KpiTone, string> = {
	accent: "text-[color:var(--chart-1)]",
	positive: "text-emerald-600 dark:text-emerald-400",
	negative: "text-rose-600 dark:text-rose-400",
};

const TONE_WASH: Record<KpiTone, string> = {
	accent: "from-[color:var(--chart-1)]/20",
	positive: "from-emerald-500/20",
	negative: "from-rose-500/20",
};

function inferToneFromLabel(
	label: string | undefined,
	fallback: KpiTone,
): KpiTone {
	if (!label) {
		return fallback;
	}
	const trimmed = label.trim();
	if (trimmed.startsWith("-")) {
		return "negative";
	}
	if (trimmed.startsWith("+")) {
		return "positive";
	}
	return fallback;
}

function KpiSparkline({
	data,
	tone,
	filled,
	className,
}: {
	data: SparklinePoint[];
	tone: KpiTone;
	filled?: boolean;
	className?: string;
}) {
	const reactId = useId();
	const gradientId = `kpi-spark-${reactId.replace(/:/g, "")}`;
	const stroke = TONE_STROKE[tone];

	const config = {
		value: {
			label: "Trend",
			color: stroke,
		},
	} satisfies ChartConfig;

	return (
		<div
			className={cn(
				"w-full [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]",
				className,
			)}
		>
			<ChartContainer
				config={config}
				className="aspect-auto h-full w-full [&_.recharts-surface]:overflow-visible"
			>
				<AreaChart
					data={data}
					margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
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
								stopOpacity={filled ? 0.35 : 0.2}
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
						fill={filled ? `url(#${gradientId})` : "transparent"}
						fillOpacity={1}
						isAnimationActive={false}
						dot={false}
						activeDot={false}
					/>
				</AreaChart>
			</ChartContainer>
		</div>
	);
}

function CompactKpiCard({
	title,
	value,
	sparkline,
	tone = "accent",
	className,
	icon: Icon,
	subtitle,
	valuePrefix,
	deltaLabel,
}: KpiCardProps) {
	const resolvedTone = inferToneFromLabel(deltaLabel, tone);
	const deltaTone = inferToneFromLabel(deltaLabel, resolvedTone);

	return (
		<Card
			className={cn(
				"h-full overflow-hidden rounded-3xl border bg-card shadow-sm",
				className,
			)}
		>
			<CardContent className="flex h-full flex-col gap-4 p-5 pt-5">
				<div className="flex items-start justify-between gap-3">
					{Icon ? (
						<div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-background text-foreground shadow-sm">
							<Icon className="size-4" />
						</div>
					) : (
						<span className="size-10" />
					)}
					<div className="min-w-0 text-right tabular-nums">
						<span className="text-2xl font-semibold tracking-tight">
							{valuePrefix ? (
								<span className={TONE_TEXT[resolvedTone]}>
									{valuePrefix}
								</span>
							) : null}
							<span className="text-foreground">{value}</span>
						</span>
					</div>
				</div>

				{sparkline && sparkline.length > 1 ? (
					<KpiSparkline
						data={sparkline}
						tone={resolvedTone}
						className="h-12"
					/>
				) : (
					<div className="h-12" />
				)}

				<div className="mt-auto flex items-end justify-between gap-3">
					<div className="min-w-0">
						<p className="truncate text-base font-semibold text-foreground">
							{title}
						</p>
						{subtitle ? (
							<p className="truncate text-sm text-muted-foreground">
								{subtitle}
							</p>
						) : null}
					</div>
					{deltaLabel ? (
						<span
							className={cn(
								"inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums",
								TONE_TEXT[deltaTone],
							)}
						>
							{deltaLabel}
						</span>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}

function InsightKpiCard({
	title,
	value,
	sparkline,
	tone = "accent",
	className,
	status,
	change,
	footer,
}: KpiCardProps) {
	const changeTone = inferToneFromLabel(change?.value, tone);

	return (
		<Card
			className={cn(
				"relative h-full overflow-hidden rounded-3xl border bg-card shadow-sm",
				className,
			)}
		>
			<div
				aria-hidden
				className={cn(
					"pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t to-transparent",
					TONE_WASH[tone],
				)}
			/>
			<CardContent className="relative flex h-full flex-col gap-4 p-5 pt-5">
				<p className="text-base font-semibold text-foreground">
					{title}
				</p>

				<div className="flex items-start justify-between gap-4">
					<p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
						{value}
					</p>
					<div className="min-w-0 space-y-1 text-right">
						{status ? (
							<p className="text-xs font-medium tracking-wide">
								<span className={TONE_TEXT[tone]}>
									{status.emphasis}
								</span>{" "}
								<span className="text-muted-foreground">
									{status.label}
								</span>
							</p>
						) : null}
						{change ? (
							<p className="text-xs tabular-nums">
								<span className={TONE_TEXT[changeTone]}>
									{change.value}
								</span>
								{change.period ? (
									<span className="text-muted-foreground">
										{" "}
										{change.period}
									</span>
								) : null}
							</p>
						) : null}
					</div>
				</div>

				{sparkline && sparkline.length > 1 ? (
					<KpiSparkline
						data={sparkline}
						tone={tone}
						filled
						className="h-14"
					/>
				) : null}

				{footer ? (
					<div className="mt-auto space-y-1">
						<p className="text-xs text-muted-foreground">
							{footer.label}
						</p>
						{footer.items.length > 0 ? (
							<p className="text-sm text-foreground">
								{footer.items.join(" · ")}
							</p>
						) : null}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

export function KpiCard(props: KpiCardProps) {
	if (props.variant === "insight") {
		return <InsightKpiCard {...props} />;
	}
	return <CompactKpiCard {...props} />;
}
