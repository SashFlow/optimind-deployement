import { config } from "@repo/config";
import { SignupForm } from "@saas/auth/SignupForm";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withQuery } from "ufo";
import { getInvitation } from "@/services/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	const t = await getTranslations();

	return {
		title: t("auth.signup.title"),
	};
}
export default async function SignupPage({
	searchParams,
}: {
	searchParams: Promise<{
		[key: string]: string | string[] | undefined;
		invitationId?: string;
	}>;
}) {
	const params = await searchParams;
	const { invitationId } = params;

	if (!(config.auth.enableSignup || invitationId)) {
		redirect(withQuery("/auth/login", params));
	}

	if (invitationId) {
		const invitation = await getInvitation(invitationId);

		if (
			!invitation ||
			invitation.status !== "pending" ||
			invitation.expiresAt.getTime() < Date.now()
		) {
			redirect(withQuery("/auth/login", params));
		}

		return (
			<SignupForm
				invitationId={invitation.id}
				prefillEmail={invitation.email}
				organizationName={invitation.organization.name}
			/>
		);
	}

	return <SignupForm />;
}
