import type {
	DocumentSourceType,
	DocumentStatus,
	KnowledgeBaseStatus,
	Prisma,
} from "../generated/client";
import { db } from "../client";

export async function listKnowledgeBases(organizationId: string) {
	return db.knowledgeBase.findMany({
		where: { organizationId, status: { not: "DELETED" } },
		include: { _count: { select: { documents: true } } },
		orderBy: { updatedAt: "desc" },
	});
}

export async function getKnowledgeBaseById(id: string) {
	return db.knowledgeBase.findUnique({
		where: { id },
		include: {
			documents: { orderBy: { createdAt: "desc" } },
			agents: true,
			campaigns: true,
		},
	});
}

export async function createKnowledgeBase(data: {
	organizationId: string;
	name: string;
	description?: string;
	embeddingModel?: string;
	embeddingDim?: number;
	metadata?: Prisma.InputJsonValue;
}) {
	return db.knowledgeBase.create({
		data: {
			organizationId: data.organizationId,
			name: data.name,
			description: data.description,
			embeddingModel: data.embeddingModel ?? "text-embedding-3-small",
			embeddingDim: data.embeddingDim ?? 1536,
			metadata: data.metadata ?? {},
		},
	});
}

export async function updateKnowledgeBase(
	id: string,
	data: {
		name?: string;
		description?: string | null;
		status?: KnowledgeBaseStatus;
		embeddingModel?: string;
		embeddingDim?: number;
		metadata?: Prisma.InputJsonValue;
	},
) {
	return db.knowledgeBase.update({ where: { id }, data });
}

export async function createDocument(data: {
	knowledgeBaseId: string;
	title: string;
	sourceType?: DocumentSourceType;
	sourceUrl?: string;
	storageKey?: string;
	metadata?: Prisma.InputJsonValue;
}) {
	return db.document.create({
		data: {
			knowledgeBaseId: data.knowledgeBaseId,
			title: data.title,
			sourceType: data.sourceType ?? "UPLOAD",
			sourceUrl: data.sourceUrl,
			storageKey: data.storageKey,
			metadata: data.metadata ?? {},
		},
	});
}

export async function updateDocument(
	id: string,
	data: {
		title?: string;
		status?: DocumentStatus;
		errorMessage?: string | null;
		metadata?: Prisma.InputJsonValue;
	},
) {
	return db.document.update({ where: { id }, data });
}

export async function createDocumentChunks(
	chunks: Array<{
		documentId: string;
		content: string;
		chunkIndex: number;
		tokenCount?: number;
		metadata?: Prisma.InputJsonValue;
		embedding?: number[];
	}>,
) {
	const results = [];
	for (const chunk of chunks) {
		const created = await db.documentChunk.create({
			data: {
				documentId: chunk.documentId,
				content: chunk.content,
				chunkIndex: chunk.chunkIndex,
				tokenCount: chunk.tokenCount,
				metadata: chunk.metadata ?? {},
				embedding: chunk.embedding ?? undefined,
			},
		});
		results.push(created);
	}
	return results;
}

export type ChunkSearchResult = {
	id: string;
	documentId: string;
	content: string;
	chunkIndex: number;
	metadata: Prisma.JsonValue;
	distance: number;
};

function cosineDistance(a: number[], b: number[]): number {
	if (a.length !== b.length || a.length === 0)
		return Number.POSITIVE_INFINITY;
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i]! * b[i]!;
		normA += a[i]! * a[i]!;
		normB += b[i]! * b[i]!;
	}
	const denom = Math.sqrt(normA) * Math.sqrt(normB);
	if (denom === 0) return Number.POSITIVE_INFINITY;
	return 1 - dot / denom;
}

export async function searchChunks(
	knowledgeBaseId: string,
	embedding: number[],
	k = 8,
): Promise<ChunkSearchResult[]> {
	const rows = await db.documentChunk.findMany({
		where: {
			embedding: { not: Prisma.DbNull },
			document: {
				knowledgeBaseId,
				status: "READY",
			},
		},
		select: {
			id: true,
			documentId: true,
			content: true,
			chunkIndex: true,
			metadata: true,
			embedding: true,
		},
	});

	const scored: ChunkSearchResult[] = [];
	for (const row of rows) {
		const vec = row.embedding;
		if (!Array.isArray(vec)) continue;
		const numbers = vec.filter((v): v is number => typeof v === "number");
		if (numbers.length === 0) continue;
		scored.push({
			id: row.id,
			documentId: row.documentId,
			content: row.content,
			chunkIndex: row.chunkIndex,
			metadata: row.metadata,
			distance: cosineDistance(embedding, numbers),
		});
	}

	return scored.sort((a, b) => a.distance - b.distance).slice(0, k);
}

export async function deleteDocument(id: string) {
	return db.document.update({
		where: { id },
		data: { status: "DELETED" },
	});
}
