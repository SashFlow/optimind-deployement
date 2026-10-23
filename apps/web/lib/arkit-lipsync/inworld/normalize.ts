import type { LipSyncInput, TimedPhoneme } from "../types";
import type { InworldPhoneticDetail } from "./types";

/**
 * Convert Inworld WORD alignment phoneticDetails into LipSyncInput.
 * Timestamps are relative to the start of the generated audio.
 */
export function phoneticDetailsToLipSyncInput(
	details: InworldPhoneticDetail[],
	audioDurationHint?: number,
): LipSyncInput {
	const phonemes: TimedPhoneme[] = [];

	for (const detail of details) {
		for (const phone of detail.phones ?? []) {
			const start = phone.startTimeSeconds ?? 0;
			const duration = phone.durationSeconds ?? 0;
			if (
				duration <= 0 &&
				(phone.phoneSymbol === "[silence]" ||
					phone.phoneSymbol === "sil")
			) {
				continue;
			}
			const stress = /[ˈ1]/.test(phone.phoneSymbol)
				? 1
				: /[ˌ2]/.test(phone.phoneSymbol)
					? 2
					: undefined;
			phonemes.push({
				phone: phone.phoneSymbol,
				start,
				end: start + Math.max(duration, 0.001),
				stress,
				viseme: phone.visemeSymbol,
				wordIndex: detail.wordIndex,
			});
		}
	}

	phonemes.sort((a, b) => a.start - b.start);

	let duration = audioDurationHint ?? 0;
	for (const p of phonemes) {
		duration = Math.max(duration, p.end);
	}

	return { phonemes, duration };
}
