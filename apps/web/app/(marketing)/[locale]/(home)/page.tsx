import { Hero } from "@components/marketing/home/Hero";
import dynamic from "next/dynamic";
import { setRequestLocale } from "next-intl/server";

const Features = dynamic(() =>
	import("@components/marketing/home/Features").then((mod) => mod.Features),
);
const Industries = dynamic(
	() => import("@components/marketing/home/Industries"),
);
const Process = dynamic(() => import("@components/marketing/home/Process"));
const Team = dynamic(() => import("@components/marketing/home/Team"));

export default async function Home({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);

	return (
		<>
			<Hero />
			<Industries />
			<Process />
			<Features />
			<Team />
		</>
	);
}
