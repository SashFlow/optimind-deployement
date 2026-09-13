"use client";

import { Card, CardContent } from "@repo/ui/card";
import { cn } from "@repo/ui/utils";

export function BigNumberCard({
	title,
	hint,
	value,
	unavailable,
	className,
}: {
	title: string;
	hint?: string;
	value: string;
	unavailable?: boolean;
	className?: string;
}) {
	return (
		<Card className={cn("h-full overflow-hidden shadow-xs", className)}>
			<CardContent className="flex h-full flex-col p-0">
				<div className="space-y-0.5 px-5 pt-5">
					<p className="text-base font-bold leading-none text-balance">
						{title}
					</p>
					{hint ? (
						<p className="text-sm text-muted-foreground text-pretty">
							{hint}
						</p>
					) : null}
				</div>
				<div className="mt-auto px-5 pb-5 pt-8">
					{unavailable ? (
						<p className="text-sm text-muted-foreground">
							Analytics unavailable
						</p>
					) : (
						<div className="text-3xl font-bold tracking-tight tabular-nums">
							{value}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
