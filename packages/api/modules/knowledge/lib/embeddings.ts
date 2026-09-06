import OpenAI from "openai";

let client: OpenAI | null = null;

function getOpenAIClient() {
	if (client) return client;
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error("OPENAI_API_KEY is not configured");
	}
	client = new OpenAI({ apiKey });
	return client;
}

export async function embedTexts(
	texts: string[],
	model: string,
): Promise<number[][]> {
	if (texts.length === 0) {
		return [];
	}

	const openai = getOpenAIClient();
	const embeddings: number[][] = [];
	const batchSize = 64;

	for (let i = 0; i < texts.length; i += batchSize) {
		const batch = texts.slice(i, i + batchSize);
		const response = await openai.embeddings.create({
			model,
			input: batch,
		});
		const sorted = [...response.data].sort((a, b) => a.index - b.index);
		for (const item of sorted) {
			embeddings.push(item.embedding);
		}
	}

	return embeddings;
}
