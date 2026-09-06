"use client";

import { Card, CardContent, CardHeader } from "@repo/ui/card";
import { Progress } from "@repo/ui/progress";

import { MetricHelpTitle } from "./MetricHelpTitle";

export function ConnectionSuccessCard({
	pct,
	unavailable,
}: {
	pct: number | null;
	unavailable?: boolean;
}) {
	const value = pct ?? 0;
	const display = pct == null ? "—" : `${pct.toFixed(1)}%`;

	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<MetricHelpTitle
					title="Connection success"
					hint="Successful LiveKit connection attempts over total attempts in the analytics window."
				/>
			</CardHeader>
			<CardContent className="space-y-4">
				{unavailable ? (
					<p className="text-sm text-muted-foreground">Analytics unavailable</p>
				) : (
					<>
						<div className="text-3xl font-semibold tabular-nums">{display}</div>
						<Progress value={value} className="w-full" />
					</>
				)}
			</CardContent>
		</Card>
	);
}
