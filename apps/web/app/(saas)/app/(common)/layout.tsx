import type { PropsWithChildren } from "react";

export default function CommonLayout({ children }: PropsWithChildren) {
	return (
		<div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-auto">
			{children}
		</div>
	);
}
