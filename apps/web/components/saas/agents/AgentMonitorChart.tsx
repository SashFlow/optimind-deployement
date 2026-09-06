"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import type { AgentStats } from "./lib/types";

export function AgentMonitorChart({ stats }: { stats: AgentStats }) {
	const max = Math.max(1, ...stats.daily.map((d) => d.count));

	return (
		<Card className="h-full rounded-3xl border shadow-sm ring-1 ring-black/5">
			<CardHeader>
				<CardTitle>Sessions over time</CardTitle>
				<CardDescription>
					Daily session volume for the selected period
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex h-[280px] items-end gap-1">
					{stats.daily.map((day) => (
						<div
							key={day.date}
							className="flex flex-1 flex-col items-center justify-end gap-1"
							title={`${day.date}: ${day.count}`}
						>
							<div
								className="w-full rounded-t bg-primary/80"
								style={{
									height: `${Math.max(4, (day.count / max) * 100)}%`,
								}}
							/>
						</div>
					))}
				</div>
				<div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
					<span>{stats.daily[0]?.date.slice(5) ?? ""}</span>
					<span>
						{stats.daily[stats.daily.length - 1]?.date.slice(5) ?? ""}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}
