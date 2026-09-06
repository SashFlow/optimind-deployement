import { config } from "@repo/config";
import { getSession } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OnboardingForm } from "@/components/saas/onboarding/OnboardingForm";
import { AuthWrapper } from "@/components/saas/shared/AuthWrapper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	const t = await getTranslations();

	return {
		title: t("onboarding.title"),
	};
}

export default async function OnboardingPage() {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	if (!config.users.enableOnboarding || session.user.onboardingComplete) {
		redirect("/app");
	}

	return (
		<AuthWrapper>
			<OnboardingForm />
		</AuthWrapper>
	);
}
