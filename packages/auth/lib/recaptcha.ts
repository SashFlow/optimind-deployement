const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

type RecaptchaVerifyResponse = {
	success: boolean;
	score?: number;
	action?: string;
	hostname?: string;
	"error-codes"?: string[];
};

export function isRecaptchaConfigured(): boolean {
	return Boolean(process.env.RECAPTCHA_SECRET_KEY?.trim());
}

/**
 * Verify a Google reCAPTCHA v3 token. No-ops (returns true) when the secret
 * is not configured so local development stays usable.
 */
export async function verifyRecaptchaToken(options: {
	token: string | null | undefined;
	expectedAction?: string;
	minScore?: number;
	remoteIp?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
	const secretKey = process.env.RECAPTCHA_SECRET_KEY?.trim();
	if (!secretKey) {
		return { ok: true };
	}

	const token = options.token?.trim();
	if (!token) {
		return { ok: false, message: "Captcha verification required" };
	}

	const minScore =
		options.minScore ??
		Number.parseFloat(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");
	const threshold = Number.isFinite(minScore) ? minScore : 0.5;

	const body = new URLSearchParams({
		secret: secretKey,
		response: token,
	});
	if (options.remoteIp) {
		body.set("remoteip", options.remoteIp);
	}

	let data: RecaptchaVerifyResponse;
	try {
		const response = await fetch(SITEVERIFY_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body,
		});
		data = (await response.json()) as RecaptchaVerifyResponse;
	} catch {
		return { ok: false, message: "Captcha verification unavailable" };
	}

	if (!data.success) {
		return { ok: false, message: "Captcha verification failed" };
	}

	if (typeof data.score === "number" && data.score < threshold) {
		return { ok: false, message: "Captcha score too low" };
	}

	if (
		options.expectedAction &&
		data.action &&
		data.action !== options.expectedAction
	) {
		return { ok: false, message: "Captcha action mismatch" };
	}

	return { ok: true };
}
