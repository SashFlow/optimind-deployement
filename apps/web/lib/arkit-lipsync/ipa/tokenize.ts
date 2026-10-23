import { IPA_ALIASES, IPA_DIACRITICS, IPA_INVENTORY } from "./inventory";

export interface TokenizeResult {
	/** Canonical phone used for mapping lookup. */
	phone: string;
	/** Original symbol after stress/digit strip but before alias. */
	raw: string;
	/** 0 none, 1 primary, 2 secondary. */
	stress: number;
	/** True if token was unknown and fell back. */
	unknown: boolean;
}

const SORTED_INVENTORY = [...IPA_INVENTORY].sort((a, b) => b.length - a.length);

function extractStress(symbol: string): { cleaned: string; stress: number } {
	let stress = 0;
	let cleaned = symbol;

	if (cleaned.includes("ˈ") || /1$/.test(cleaned)) stress = 1;
	else if (cleaned.includes("ˌ") || /2$/.test(cleaned)) stress = 2;

	cleaned = cleaned.replace(/[ˈˌ]/g, "");
	cleaned = cleaned.replace(/[12]$/g, "");
	// Strip combining diacritics but keep length marker handling via inventory match first
	cleaned = cleaned.replace(IPA_DIACRITICS, (ch) =>
		ch === "ː" || ch === "ˑ" ? ch : "",
	);

	return { cleaned, stress };
}

/**
 * Normalize a single TTS phone symbol to a canonical mapping key.
 * Does not split multi-phone strings from Inworld (those arrive as one symbol).
 */
export function normalizePhone(
	symbol: string,
	aliases: Record<string, string> = IPA_ALIASES,
): TokenizeResult {
	const trimmed = symbol.trim();
	if (!trimmed || trimmed === "[silence]") {
		return { phone: "sil", raw: "sil", stress: 0, unknown: false };
	}

	const { cleaned, stress } = extractStress(trimmed);

	// Prefer exact inventory match including length markers
	let candidate = cleaned;
	if (aliases[candidate]) candidate = aliases[candidate];

	// Try longest inventory match on the whole string
	for (const entry of SORTED_INVENTORY) {
		if (candidate === entry) {
			const aliased = aliases[entry] ?? entry;
			return { phone: aliased, raw: cleaned, stress, unknown: false };
		}
	}

	// Strip length and retry
	const noLength = candidate.replace(/[ːˑ]/g, "");
	if (aliases[noLength]) {
		return {
			phone: aliases[noLength],
			raw: cleaned,
			stress,
			unknown: false,
		};
	}
	for (const entry of SORTED_INVENTORY) {
		if (noLength === entry) {
			return {
				phone: aliases[entry] ?? entry,
				raw: cleaned,
				stress,
				unknown: false,
			};
		}
	}

	// Unknown: return cleaned form (or sil)
	if (!noLength)
		return { phone: "sil", raw: cleaned, stress, unknown: false };
	return {
		phone: aliases[noLength] ?? noLength,
		raw: cleaned,
		stress,
		unknown: true,
	};
}

/**
 * Tokenize an IPA string that may contain multiple phones (for combined sequences).
 * Uses longest-match greedy scan. Prefer normalizePhone for Inworld single symbols.
 */
export function tokenizeIpa(
	input: string,
	aliases: Record<string, string> = IPA_ALIASES,
): TokenizeResult[] {
	const { cleaned, stress } = extractStress(input.trim());
	if (!cleaned || cleaned === "[silence]") {
		return [{ phone: "sil", raw: "sil", stress: 0, unknown: false }];
	}

	const tokens: TokenizeResult[] = [];
	let i = 0;
	while (i < cleaned.length) {
		let matched = false;
		for (const entry of SORTED_INVENTORY) {
			if (cleaned.startsWith(entry, i)) {
				const aliased = aliases[entry] ?? entry;
				tokens.push({
					phone: aliased,
					raw: entry,
					stress,
					unknown: false,
				});
				i += entry.length;
				matched = true;
				break;
			}
		}
		if (!matched) {
			const ch = cleaned[i];
			const aliased = aliases[ch] ?? ch;
			tokens.push({
				phone: aliased,
				raw: ch,
				stress,
				unknown: !aliases[ch] && !IPA_INVENTORY.includes(ch),
			});
			i += 1;
		}
	}
	return tokens.length
		? tokens
		: [{ phone: "sil", raw: "sil", stress: 0, unknown: false }];
}

export function applyAlias(
	phone: string,
	aliases: Record<string, string>,
): string {
	return aliases[phone] ?? phone;
}
