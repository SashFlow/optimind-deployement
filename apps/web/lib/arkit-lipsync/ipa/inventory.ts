/**
 * English IPA inventory used for longest-match tokenization.
 * Ordered longest-first for greedy matching.
 * Approximations for Inworld TTS phone symbols.
 */
export const IPA_MULTI: readonly string[] = [
	"tʃ",
	"dʒ",
	"aɪ",
	"aʊ",
	"ɔɪ",
	"eɪ",
	"oʊ",
	"əʊ",
	"ɪə",
	"eə",
	"ʊə",
	"ɑː",
	"ɔː",
	"iː",
	"uː",
	"ɜː",
	"ɛː",
	"oː",
	"æː",
];

/** Single-character / common IPA phones. */
export const IPA_SINGLE: readonly string[] = [
	"ɑ",
	"æ",
	"ʌ",
	"ə",
	"ɚ",
	"ɝ",
	"ɛ",
	"e",
	"ɪ",
	"i",
	"ɔ",
	"ɒ",
	"ʊ",
	"u",
	"o",
	"a",
	"p",
	"b",
	"t",
	"d",
	"k",
	"g",
	"ɡ",
	"m",
	"n",
	"ŋ",
	"f",
	"v",
	"θ",
	"ð",
	"s",
	"z",
	"ʃ",
	"ʒ",
	"h",
	"l",
	"ɫ",
	"r",
	"ɹ",
	"ɾ",
	"w",
	"ʍ",
	"j",
	"ʝ",
	"x",
	"c",
	"ʔ",
];

export const IPA_INVENTORY: readonly string[] = [...IPA_MULTI, ...IPA_SINGLE];

/** Alias → canonical phone used in the default mapping. */
export const IPA_ALIASES: Record<string, string> = {
	ɡ: "g",
	ɫ: "l",
	ɹ: "r",
	ɾ: "t",
	ʍ: "w",
	ʝ: "j",
	əʊ: "oʊ",
	ɚ: "ɝ",
	"[silence]": "sil",
	silence: "sil",
	sil: "sil",
	_: "sil",
	"": "sil",
};

/** Stress / length / diacritic characters to strip while tokenizing. */
export const IPA_DIACRITICS = /[\u0300-\u036fˈˌːˑ.‿|‖↑↓↗↘̥̬̤̰̼̪̺̻̹̜̟̠̩̯̆̃̈̽͜͡˞]/g;
