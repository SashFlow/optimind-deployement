"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/card";

export function ChannelBreakdownCard({
	byChannel,
}: {
	byChannel: Record<string, number>;
}) {
	const entries = Object.entries(byChannel).sort((a, b) => b[1] - a[1]);
	const max = Math.max(...entries.map(([, count]) => count), 1);

	return (
		<Card className="h-full border-transparent bg-foreground text-background">
			<CardHeader>
				<CardTitle className="text-background">By channel</CardTitle>
				<CardDescription>
					Session volume across channels
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{entries.length === 0 ? (
					<p className="text-sm text-background/60">
						No sessions yet.
					</p>
				) : (
					entries.map(([channel, count]) => {
						const ratio = count / max;
						const segments = 24;
						const filled = Math.max(
							1,
							Math.round(ratio * segments),
						);

						return (
							<div key={channel} className="space-y-2">
								<div className="flex items-center justify-between gap-3 text-sm">
									<span className="capitalize text-background/80">
										{channel}
									</span>
									<span className="font-medium tabular-nums text-background">
										{count.toLocaleString()}
									</span>
								</div>
								<div className="flex h-3 gap-0.5">
									{Array.from({ length: segments }).map(
										(_, index) => (
											<div
												key={index}
												className="h-full flex-1 rounded-[1px]"
												style={{
													background:
														index < filled
															? "linear-gradient(90deg, var(--chart-1), var(--chart-3))"
															: "color-mix(in oklch, var(--background) 18%, transparent)",
												}}
											/>
										),
									)}
								</div>
							</div>
						);
					})
				)}
			</CardContent>
		</Card>
	);
}
