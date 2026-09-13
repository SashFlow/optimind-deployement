import { Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";
import PrimaryButton from "../src/components/PrimaryButton";
import Wrapper from "../src/components/Wrapper";
import { defaultLocale, defaultTranslations } from "../src/util/translations";
import type { BaseMailProps } from "../types";

export function ForgotPassword({
	url,
	locale,
	translations,
}: {
	url: string;
	name: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: translations,
	});

	return (
		<Wrapper>
			<Text>{t("mail.forgotPassword.body")}</Text>

			<PrimaryButton href={url}>
				{t("mail.forgotPassword.resetPassword")} &rarr;
			</PrimaryButton>
		</Wrapper>
	);
}

ForgotPassword.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	url: "#",
	name: "John Doe",
};

export default ForgotPassword;
