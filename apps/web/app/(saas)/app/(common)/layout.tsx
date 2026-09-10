import type { PropsWithChildren } from "react";

export default function CommonLayout({ children }: PropsWithChildren) {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-16">
			<div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
				{children}
			</div>
		</div>
	);
}
