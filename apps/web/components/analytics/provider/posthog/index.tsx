"use client";

import { useCookieConsent } from "@shared/hooks/cookie-consent";
import { useEffect } from "react";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY as string;

export function AnalyticsScript() {
	const { userHasConsented } = useCookieConsent();

	useEffect(() => {
		if (!posthogKey || !userHasConsented) {
			return;
		}

		import("posthog-js").then(({ default: posthog }) => {
			posthog.init(posthogKey, {
				api_host: "https://i.posthog.com",
				person_profiles: "identified_only",
				persistence: "localStorage+cookie",
			});
		});
	}, [userHasConsented]);

	useEffect(() => {
		if (!posthogKey || userHasConsented) {
			return;
		}
		import("posthog-js").then(({ default: posthog }) => {
			if (posthog.__loaded) {
				posthog.opt_out_capturing();
			}
		});
	}, [userHasConsented]);

	return null;
}

export function useAnalytics() {
	const { userHasConsented } = useCookieConsent();

	const trackEvent = (event: string, data?: Record<string, unknown>) => {
		if (!posthogKey || !userHasConsented) {
			return;
		}

		import("posthog-js").then(({ default: posthog }) => {
			posthog.capture(event, data);
		});
	};

	return {
		trackEvent,
	};
}
