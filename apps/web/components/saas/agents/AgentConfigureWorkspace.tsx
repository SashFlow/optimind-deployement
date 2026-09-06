"use client";

import type { PropsWithChildren, ReactNode } from "react";

export function AgentConfigureWorkspace({
	children,
	preview,
}: PropsWithChildren<{ preview: ReactNode }>) {
	return (
		<div className="flex min-h-0 flex-1 overflow-hidden">
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				{children}
			</div>
			<aside className="hidden min-h-0 w-[min(420px,40%)] shrink-0 flex-col overflow-hidden border-l bg-muted/10 md:flex">
				{preview}
			</aside>
		</div>
	);
}
