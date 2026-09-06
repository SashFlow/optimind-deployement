"use client";

import { cn } from "@repo/ui/utils";
import { CheckIcon } from "lucide-react";

export function ConfigureRadioCard<T extends string>({
	options,
	value,
	onChange,
}: {
	options: { value: T; label: string; description: string }[];
	value: T;
	onChange: (value: T) => void;
}) {
	return (
		<div className="flex flex-col gap-2">
			{options.map((option) => {
				const selected = value === option.value;
				return (
					<button
						key={option.value}
						type="button"
						onClick={() => onChange(option.value)}
						className={cn(
							"flex w-full items-start justify-between gap-4 rounded-lg border p-3 text-left transition-colors",
							selected
								? "border-foreground bg-background"
								: "border-transparent bg-background/60 hover:bg-background",
						)}
					>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">
								{option.label}
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								{option.description}
							</p>
						</div>
						<div
							className={cn(
								"mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
								selected
									? "border-foreground bg-foreground text-background"
									: "border-muted-foreground/40",
							)}
						>
							{selected ? <CheckIcon className="size-3" /> : null}
						</div>
					</button>
				);
			})}
		</div>
	);
}
