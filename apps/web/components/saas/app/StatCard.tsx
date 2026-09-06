"use client";

import { Card, CardContent } from "@repo/ui/card";
import { cn } from "@repo/ui/utils";

export function StatCard({
	title,
	value,
	icon: Icon,
	description,
	className,
}: {
	title: string;
	value: string | number;
	icon: React.ComponentType<{ className?: string }>;
	description?: string;
	sparkline?: { value: number }[];
	deltaPct?: number | null;
	className?: string;
}) {
	return (
		<Card
			className={cn(
				"h-full overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5",
				className,
			)}
		>
			<CardContent className="relative pt-6">
				<div className="flex items-start justify-between gap-3">
					<div className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
						<Icon className="size-4" />
					</div>
				</div>
				<div className="mt-4 space-y-1">
					<p className="text-muted-foreground text-sm">{title}</p>
					<p className="font-semibold text-3xl tracking-tight">
						{value}
					</p>
					{description ? (
						<p className="text-muted-foreground text-xs">
							{description}
						</p>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}

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
