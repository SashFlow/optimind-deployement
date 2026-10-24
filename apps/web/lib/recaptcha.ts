const SCRIPT_ID = "google-recaptcha-v3";

declare global {
	interface Window {
		grecaptcha?: {
			ready: (callback: () => void) => void;
			execute: (
				siteKey: string,
				options: { action: string },
			) => Promise<string>;
		};
	}
}

export function getRecaptchaSiteKey(): string | null {
	return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || null;
}

function loadRecaptchaScript(siteKey: string): Promise<void> {
	if (typeof window === "undefined") {
		return Promise.reject(new Error("reCAPTCHA is browser-only"));
	}
	if (window.grecaptcha) {
		return new Promise((resolve) => {
			window.grecaptcha?.ready(() => resolve());
		});
	}

	const existing = document.getElementById(SCRIPT_ID);
	if (existing) {
		return new Promise((resolve, reject) => {
			existing.addEventListener("load", () => {
				window.grecaptcha?.ready(() => resolve());
			});
			existing.addEventListener("error", () =>
				reject(new Error("Failed to load reCAPTCHA")),
			);
		});
	}

	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.id = SCRIPT_ID;
		script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
		script.async = true;
		script.onload = () => {
			window.grecaptcha?.ready(() => resolve());
		};
		script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
		document.head.appendChild(script);
	});
}

/**
 * Execute reCAPTCHA v3 for an action. Returns null when the site key is not
 * configured (local / captcha-disabled environments).
 */
export async function getRecaptchaToken(
	action: string,
): Promise<string | null> {
	const siteKey = getRecaptchaSiteKey();
	if (!siteKey) {
		return null;
	}

	await loadRecaptchaScript(siteKey);
	if (!window.grecaptcha) {
		throw new Error("reCAPTCHA failed to initialize");
	}

	return window.grecaptcha.execute(siteKey, { action });
}

export function recaptchaHeaders(
	token: string | null,
): Record<string, string> | undefined {
	if (!token) {
		return undefined;
	}
	return { "x-captcha-response": token };
}
