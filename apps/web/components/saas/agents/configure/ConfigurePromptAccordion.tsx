"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@repo/ui/accordion";
import { cn } from "@repo/ui/utils";
import type { PropsWithChildren } from "react";

export function ConfigurePromptAccordion({
	value,
	title,
	children,
	className,
}: PropsWithChildren<{
	value: string;
	title: string;
	className?: string;
}>) {
	return (
		<Accordion className={cn("w-full", className)}>
			<AccordionItem value={value} className="border-none">
				<AccordionTrigger className="px-3 py-3 hover:no-underline [&>svg]:ml-2">
					<span className="text-sm font-medium">{title}</span>
				</AccordionTrigger>
				<AccordionContent className="px-3 pb-3">
					<div className="rounded-xl border bg-background p-4">
						{children}
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
