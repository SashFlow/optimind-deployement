import type { PropsWithChildren } from "react";
import { AuthPreviewPanel } from "./AuthPreviewPanel";

export function AuthShell({ children }: PropsWithChildren) {
	return (
		<div className="flex h-svh w-full overflow-hidden bg-white">
			<main className="flex h-full w-full flex-col justify-center overflow-y-auto px-8 py-10 sm:px-12 md:w-[45%] lg:px-16">
				{children}
			</main>
			<div className="relative hidden h-full w-[55%] md:block">
				<AuthPreviewPanel />
			</div>
		</div>
	);
}
