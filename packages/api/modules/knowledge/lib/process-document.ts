import {
	createDocumentChunks,
	deleteDocumentChunks,
	getDocumentById,
	updateDocument,
} from "@repo/database";
import { chunkText } from "./chunk-text";
import { embedTexts } from "./embeddings";
import {
	extractTextFromBuffer,
	extractTextFromUrl,
} from "./extract-text";
import { downloadKnowledgeObject, getKnowledgeBucket } from "./s3";

export async function processKnowledgeDocument(input: {
	documentId: string;
	textContent?: string;
}): Promise<{
	document: NonNullable<Awaited<ReturnType<typeof getDocumentById>>>;
	chunkCount: number;
}> {
	const existing = await getDocumentById(input.documentId);
	if (!existing) {
		throw new Error("Document not found");
	}

	await updateDocument(input.documentId, {
		status: "PROCESSING",
		errorMessage: null,
	});

	try {
		const metadata =
			existing.metadata &&
			typeof existing.metadata === "object" &&
			!Array.isArray(existing.metadata)
				? (existing.metadata as Record<string, unknown>)
				: {};

		let text = input.textContent?.trim() ?? "";
		if (!text && existing.sourceType === "URL" && existing.sourceUrl) {
			text = await extractTextFromUrl(existing.sourceUrl);
		}
		if (!text && existing.storageKey) {
			const bucket =
				typeof metadata.bucket === "string"
					? metadata.bucket
					: getKnowledgeBucket();
			const buffer = await downloadKnowledgeObject({
				bucket,
				key: existing.storageKey,
			});
			text = await extractTextFromBuffer(buffer, {
				fileName:
					typeof metadata.fileName === "string"
						? metadata.fileName
						: existing.title,
				contentType:
					typeof metadata.contentType === "string"
						? metadata.contentType
						: undefined,
			});
		}

		if (!text.trim()) {
			throw new Error("No extractable text found in document");
		}

		const chunks = chunkText(text);
		if (chunks.length === 0) {
			throw new Error("Document produced no chunks");
		}

		const embeddings = await embedTexts(
			chunks.map((chunk) => chunk.content),
			existing.knowledgeBase.embeddingModel,
		);

		await deleteDocumentChunks(input.documentId);
		await createDocumentChunks(
			chunks.map((chunk, index) => ({
				documentId: input.documentId,
				content: chunk.content,
				chunkIndex: chunk.chunkIndex,
				tokenCount: chunk.tokenCount,
				embedding: embeddings[index],
				metadata: {
					sourceType: existing.sourceType,
				},
			})),
		);

		const document = await updateDocument(input.documentId, {
			status: "READY",
			errorMessage: null,
			metadata: {
				...metadata,
				chunkCount: chunks.length,
				processedAt: new Date().toISOString(),
			},
		});

		const refreshed = await getDocumentById(document.id);
		return {
			document: refreshed ?? { ...existing, ...document },
			chunkCount: chunks.length,
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Document processing failed";
		await updateDocument(input.documentId, {
			status: "FAILED",
			errorMessage: message,
		});
		throw error;
	}
}
