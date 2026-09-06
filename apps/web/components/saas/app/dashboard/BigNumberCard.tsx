"use client";

import { Card, CardContent, CardHeader } from "@repo/ui/card";

import { MetricHelpTitle } from "./MetricHelpTitle";

export function BigNumberCard({
	title,
	hint,
	value,
	unavailable,
}: {
	title: string;
	hint?: string;
	value: string;
	unavailable?: boolean;
}) {
	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<MetricHelpTitle title={title} hint={hint} />
			</CardHeader>
			<CardContent>
				{unavailable ? (
					<p className="text-sm text-muted-foreground">Analytics unavailable</p>
				) : (
					<div className="text-3xl font-semibold tabular-nums">{value}</div>
				)}
			</CardContent>
		</Card>
	);
}
