import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { MailCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function OrganizationInvitationAlert({
	className,
}: {
	className?: string;
}) {
	const t = useTranslations();
	return (
		<Alert variant="info" className={className}>
			<MailCheckIcon />
			<AlertTitle>{t("organizations.invitationAlert.title")}</AlertTitle>
			<AlertDescription>
				{t("organizations.invitationAlert.description")}
			</AlertDescription>
		</Alert>
	);
}
