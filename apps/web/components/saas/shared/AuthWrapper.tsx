import { AuthShell } from "@saas/auth/AuthShell";
import type { PropsWithChildren } from "react";

/** @deprecated Use AuthShell — kept as alias for onboarding / invitation routes */
export function AuthWrapper({
	children,
}: PropsWithChildren<{ contentClass?: string }>) {
	return <AuthShell>{children}</AuthShell>;
}
