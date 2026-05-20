import Header from "@components/marketing/shared/header";
import TransitionProvider from "@context/TransitionProvider";
import { Document } from "@shared/components/Document";
import { getLocale } from "next-intl/server";
import React from "react";

const DemoLayout = async ({ children }: { children: React.ReactNode }) => {
	const locale = await getLocale();
	return (
		<Document locale={locale}>
			{" "}
			<TransitionProvider>
				<Header />
				<main className="min-h-screen">{children}</main>
			</TransitionProvider>
		</Document>
	);
};

export default DemoLayout;
