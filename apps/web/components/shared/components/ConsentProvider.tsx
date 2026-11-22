"use client";

import Cookies from "js-cookie";
import { createContext, useState } from "react";

export type ConsentStatus = "unknown" | "accepted" | "declined";

export const ConsentContext = createContext<{
	/** True only when analytics/marketing cookies were accepted. */
	userHasConsented: boolean;
	/** Whether the user has made a choice (accept or decline). */
	consentDecided: boolean;
	consentStatus: ConsentStatus;
	allowCookies: () => void;
	declineCookies: () => void;
}>({
	userHasConsented: false,
	consentDecided: false,
	consentStatus: "unknown",
	allowCookies: () => {},
	declineCookies: () => {},
});

function readStatus(initialConsent?: boolean): ConsentStatus {
	if (typeof initialConsent === "boolean") {
		return initialConsent ? "accepted" : "declined";
	}
	if (typeof document === "undefined") {
		return "unknown";
	}
	const value = Cookies.get("consent");
	if (value === "true") {
		return "accepted";
	}
	if (value === "false") {
		return "declined";
	}
	return "unknown";
}

export function ConsentProvider({
	children,
	initialConsent,
}: {
	children: React.ReactNode;
	initialConsent?: boolean;
}) {
	const [consentStatus, setConsentStatus] = useState<ConsentStatus>(() =>
		readStatus(initialConsent),
	);

	const allowCookies = () => {
		Cookies.set("consent", "true", { expires: 365, sameSite: "Lax" });
		setConsentStatus("accepted");
	};

	const declineCookies = () => {
		Cookies.set("consent", "false", { expires: 365, sameSite: "Lax" });
		setConsentStatus("declined");
	};

	return (
		<ConsentContext.Provider
			value={{
				userHasConsented: consentStatus === "accepted",
				consentDecided: consentStatus !== "unknown",
				consentStatus,
				allowCookies,
				declineCookies,
			}}
		>
			{children}
		</ConsentContext.Provider>
	);
}
