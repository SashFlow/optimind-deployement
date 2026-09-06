"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@repo/ui/accordion";
import { cn } from "@repo/ui/utils";
import type { PropsWithChildren } from "react";

export function ConfigureAccordionGroup({
	className,
	defaultValue,
	children,
}: PropsWithChildren<{
	className?: string;
	defaultValue?: string[];
}>) {
	return (
		<div className={cn("rounded-xl border bg-card p-2", className)}>
			<Accordion multiple defaultValue={defaultValue} className="gap-0">
				{children}
			</Accordion>
		</div>
	);
}

export function ConfigureAccordionItem({
	value,
	trigger,
	children,
	className,
}: PropsWithChildren<{
	value: string;
	trigger: React.ReactNode;
	className?: string;
}>) {
	return (
		<AccordionItem
			value={value}
			className={cn("border-b last:border-b-0", className)}
		>
			<AccordionTrigger className="px-3 py-3 hover:no-underline [&>svg]:ml-2">
				{trigger}
			</AccordionTrigger>
			<AccordionContent className="px-3 pb-3">
				{children}
			</AccordionContent>
		</AccordionItem>
	);
}
