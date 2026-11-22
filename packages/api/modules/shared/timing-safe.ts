import { timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";

/** Constant-time string compare for API keys / secrets. */
export function timingSafeEqualString(
	a: string | null | undefined,
	b: string | null | undefined,
): boolean {
	if (!a || !b) {
		return false;
	}
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) {
		return false;
	}
	return nodeTimingSafeEqual(bufA, bufB);
}
