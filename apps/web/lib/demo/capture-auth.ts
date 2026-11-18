import { timingSafeEqual } from "node:crypto";

export function demoCapturePassword() {
	return process.env.DEMO_CAPTURE_PASSWORD?.trim() || "";
}

export function demoCapturePasswordsMatch(provided: string, expected: string) {
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	if (a.length !== b.length) {
		return false;
	}
	return timingSafeEqual(a, b);
}

/** Validate a demo playground password. Returns an error response or null when ok. */
export function unauthorizedDemoCapture(
	password: string | undefined,
): Response | null {
	const expected = demoCapturePassword();
	if (!expected) {
		return new Response(
			"Capture playground is not configured (DEMO_CAPTURE_PASSWORD)",
			{ status: 503 },
		);
	}
	const provided = password?.trim() || "";
	if (!provided || !demoCapturePasswordsMatch(provided, expected)) {
		return new Response("Invalid password", { status: 401 });
	}
	return null;
}
