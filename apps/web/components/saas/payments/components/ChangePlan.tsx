"use client";
import { PricingTable } from "@saas/payments/components/PricingTable";
import { useTranslations } from "next-intl";
import { SettingsItem } from "@/components/saas/shared/SettingsItem";

export function ChangePlan({
	organizationId,
	userId,
	activePlanId,
}: {
	organizationId?: string;
	userId?: string;
	activePlanId?: string;
}) {
	const t = useTranslations();

	return (
		<SettingsItem
			title={t("settings.billing.changePlan.title")}
			description={t("settings.billing.changePlan.description")}
		>
			<PricingTable
				organizationId={organizationId}
				userId={userId}
				activePlanId={activePlanId}
			/>
		</SettingsItem>
	);
}
