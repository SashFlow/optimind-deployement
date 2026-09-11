import { AuthShell } from "@saas/auth/AuthShell";
import { Document } from "@shared/components/Document";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { SessionProvider } from "@/context/SessionProvider";

export default async function AuthLayout({ children }: PropsWithChildren) {
	const locale = await getLocale();
	const messages = await getMessages();

	return (
		<Document locale={locale}>
			<NextIntlClientProvider messages={messages}>
				<SessionProvider>
					<AuthShell>{children}</AuthShell>
				</SessionProvider>
			</NextIntlClientProvider>
		</Document>
	);
}
