import { headingFont, poppins } from "@app/fonts";
import { cn } from "@repo/ui/utils";
import { ClientProviders } from "@shared/components/ClientProviders";
import { ConsentProvider } from "@shared/components/ConsentProvider";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { PropsWithChildren } from "react";

export async function Document({
	children,
	locale,
}: PropsWithChildren<{ locale: string }>) {
	const cookieStore = await cookies();
	const consentCookie = cookieStore.get("consent");

	return (
		<html
			lang={locale}
			suppressHydrationWarning
			className={cn(poppins.variable, headingFont.variable)}
		>
			<body
				className={cn(
					"min-h-screen bg-background text-foreground antialiased",
				)}
			>
				<NuqsAdapter>
					<ConsentProvider
						initialConsent={consentCookie?.value === "true"}
					>
						<ClientProviders>{children}</ClientProviders>
					</ConsentProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}
