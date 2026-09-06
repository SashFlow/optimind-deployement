/**
 * Rough token estimate (~4 chars/token) and character-based chunking
 * with overlap for embedding ingest.
 */
const DEFAULT_CHUNK_CHARS = 2800; // ~700 tokens
const DEFAULT_OVERLAP_CHARS = 400;

export function estimateTokenCount(text: string): number {
	return Math.max(1, Math.ceil(text.length / 4));
}

export function chunkText(
	text: string,
	options?: { chunkChars?: number; overlapChars?: number },
): Array<{ content: string; chunkIndex: number; tokenCount: number }> {
	const chunkChars = options?.chunkChars ?? DEFAULT_CHUNK_CHARS;
	const overlapChars = options?.overlapChars ?? DEFAULT_OVERLAP_CHARS;
	const normalized = text.replace(/\r\n/g, "\n").trim();
	if (!normalized) {
		return [];
	}

	if (normalized.length <= chunkChars) {
		return [
			{
				content: normalized,
				chunkIndex: 0,
				tokenCount: estimateTokenCount(normalized),
			},
		];
	}

	const chunks: Array<{
		content: string;
		chunkIndex: number;
		tokenCount: number;
	}> = [];
	let start = 0;
	let index = 0;

	while (start < normalized.length) {
		let end = Math.min(start + chunkChars, normalized.length);
		if (end < normalized.length) {
			const slice = normalized.slice(start, end);
			const breakAt = Math.max(
				slice.lastIndexOf("\n\n"),
				slice.lastIndexOf("\n"),
				slice.lastIndexOf(". "),
				slice.lastIndexOf(" "),
			);
			if (breakAt > chunkChars * 0.4) {
				end = start + breakAt + 1;
			}
		}

		const content = normalized.slice(start, end).trim();
		if (content) {
			chunks.push({
				content,
				chunkIndex: index,
				tokenCount: estimateTokenCount(content),
			});
			index += 1;
		}

		if (end >= normalized.length) {
			break;
		}
		start = Math.max(0, end - overlapChars);
	}

	return chunks;
}
