"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@repo/ui/tooltip";
import { HelpCircleIcon } from "lucide-react";

export function MetricHelpTitle({
	title,
	hint,
}: {
	title: string;
	hint?: string;
}) {
	return (
		<div className="flex items-center gap-1.5">
			<span className="text-sm font-medium text-muted-foreground">
				{title}
			</span>
			{hint ? (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger
							type="button"
							className="inline-flex text-muted-foreground/70 hover:text-muted-foreground"
							aria-label={`${title} help`}
						>
							<HelpCircleIcon className="size-3.5" />
						</TooltipTrigger>
						<TooltipContent>{hint}</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			) : null}
		</div>
	);
}
