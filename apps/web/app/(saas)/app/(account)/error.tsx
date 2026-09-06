"use client";

import { Button } from "@repo/ui/button";

export default function AccountError({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
			<p className="text-sm text-destructive" role="alert">
				Unable to load this account page.
			</p>
			<Button variant="outline" onClick={reset}>
				Try again
			</Button>
		</div>
	);
}
