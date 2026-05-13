import type { PropsWithChildren } from "react";
import { DemoProvider } from "@context/DemoProvider";

export default async function SlugLayout({
	children,
	params,
}: PropsWithChildren<{ params: Promise<{ slug: string }> }>) {
	const { slug } = await params;

	return <DemoProvider slug={slug}>{children}</DemoProvider>;
}