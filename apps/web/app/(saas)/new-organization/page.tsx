import { config } from "@repo/config";
import { CreateOrganizationForm } from "@saas/organizations/CreateOrganizationForm";
import { redirect } from "next/navigation";
import { AuthWrapper } from "@/components/saas/shared/AuthWrapper";
import { getOrganizationList } from "@/services/session";

export const dynamic = "force-dynamic";

export default async function NewOrganizationPage() {
	const organizations = await getOrganizationList();

	if (
		!config.organizations.enable ||
		(!config.organizations.enableUsersToCreateOrganizations &&
			(!config.organizations.requireOrganization ||
				organizations.length > 0))
	) {
		redirect("/app");
	}

	return (
		<AuthWrapper>
			<CreateOrganizationForm />
		</AuthWrapper>
	);
}
