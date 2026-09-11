import { Logo } from "@shared/components/Logo";
import type { ReactNode } from "react";

export const authInputClassName =
	"bg-background placeholder:text-muted-foreground/70";

export const authSubmitClassName =
	"h-11 w-full rounded-full bg-black text-white hover:bg-black/90";

export function AuthCard({
	title,
	description,
	children,
	footer,
}: {
	title: string;
	description?: string;
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full max-w-sm flex-col">
			<div className="mb-8">
				<Logo withLabel={false} className="mb-6 [&_svg]:size-8" />
				<h1 className="text-3xl font-semibold tracking-tight text-foreground">
					{title}
				</h1>
				{description && (
					<p className="mt-2 text-sm text-muted-foreground">
						{description}
					</p>
				)}
			</div>
			{children}
			{footer && (
				<div className="mt-8 text-center text-sm text-muted-foreground">
					{footer}
				</div>
			)}
		</div>
	);
}

export function AuthError({ message }: { message: string | null }) {
	if (!message) {
		return null;
	}

	return (
		<p
			className="rounded-2xl bg-destructive/10 px-4 py-3 text-destructive text-sm"
			role="alert"
		>
			{message}
		</p>
	);
}
