"use client";

import { cn } from "@repo/ui/utils";

const SPEED_OPTIONS = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2] as const;

export function VoiceSpeedPicker({
	value,
	onChange,
	className,
}: {
	value: number | null | undefined;
	onChange: (speed: number) => void;
	className?: string;
}) {
	const current = value ?? 1.0;

	return (
		<div
			className={cn(
				"inline-flex flex-wrap items-center gap-1 rounded-full bg-muted p-1",
				className,
			)}
		>
			{SPEED_OPTIONS.map((speed) => {
				const selected = Math.abs(current - speed) < 0.01;
				return (
					<button
						key={speed}
						type="button"
						onClick={() => onChange(speed)}
						className={cn(
							"rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
							selected
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{speed.toFixed(1)}x
					</button>
				);
			})}
		</div>
	);
}
