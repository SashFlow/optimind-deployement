"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@repo/ui/accordion";
import { cn } from "@repo/ui/utils";
import type { PropsWithChildren, ReactNode } from "react";

export function ConfigureSectionAccordion({
	value,
	title,
	description,
	children,
	className,
}: PropsWithChildren<{
	value: string;
	title: string;
	description?: string;
	className?: string;
}>) {
	return (
		<Accordion className={cn("w-full", className)}>
			<AccordionItem value={value} className="border-none">
				<AccordionTrigger className="px-0 py-3 hover:no-underline [&>svg]:ml-2">
					<span className="text-sm font-medium">{title}</span>
				</AccordionTrigger>
				<AccordionContent className="pb-0">
					<div className="grid grid-cols-1 gap-4 pb-2 @xl:grid-cols-[min(100%,280px)_1fr] @xl:gap-8">
						{description ? (
							<div className="flex shrink-0 flex-col gap-1.5">
								<p className="m-0 text-xs text-muted-foreground">
									{description}
								</p>
							</div>
						) : (
							<div />
						)}
						<div className="rounded-xl bg-muted/40 p-4">
							{children}
						</div>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}

export function ConfigureSectionPanel({
	title,
	description,
	children,
}: PropsWithChildren<{
	title: string;
	description?: string;
	children: ReactNode;
}>) {
	return (
		<div className="grid grid-cols-1 gap-4 @xl:grid-cols-[min(100%,280px)_1fr] @xl:gap-8">
			<div className="flex shrink-0 flex-col gap-1.5">
				<h3 className="m-0 text-sm font-semibold">{title}</h3>
				{description ? (
					<p className="m-0 text-xs text-muted-foreground">
						{description}
					</p>
				) : null}
			</div>
			<div className="rounded-xl bg-muted/40 p-4">{children}</div>
		</div>
	);
}
