import { ORPCError } from "@orpc/client";
import {
	createDocument,
	createDocumentChunks,
	createKnowledgeBase,
	deleteDocument,
	getDocumentById,
	getKnowledgeBaseById,
	listKnowledgeBases,
	searchChunks,
	updateDocument,
	updateKnowledgeBase,
} from "@repo/database";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";
import {
	titleFromFileName,
	titleFromText,
	titleFromUrl,
} from "./lib/document-title";
import { processKnowledgeDocument } from "./lib/process-document";
import { createKnowledgeSignedUploadUrl, getKnowledgeBucket } from "./lib/s3";

async function requireKb(id: string, userId: string) {
	const kb = await getKnowledgeBaseById(id);
	if (!kb) throw new ORPCError("NOT_FOUND");
	await requireOrgMembership(kb.organizationId, userId);
	return kb;
}

async function requireDocument(documentId: string, userId: string) {
	const document = await getDocumentById(documentId);
	if (!document) throw new ORPCError("NOT_FOUND");
	await requireOrgMembership(document.knowledgeBase.organizationId, userId);
	return document;
}

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/knowledge-bases",
		tags: ["Knowledge"],
		summary: "List knowledge bases",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		return {
			knowledgeBases: await listKnowledgeBases(input.organizationId),
		};
	});

export const get = protectedProcedure
	.route({
		method: "GET",
		path: "/knowledge-bases/{id}",
		tags: ["Knowledge"],
		summary: "Get knowledge base",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const knowledgeBase = await requireKb(input.id, context.user.id);
		return { knowledgeBase };
	});

export const create = protectedProcedure
	.route({
		method: "POST",
		path: "/knowledge-bases",
		tags: ["Knowledge"],
		summary: "Create knowledge base",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string().min(1),
			description: z.string().optional(),
			embeddingModel: z.string().optional(),
			embeddingDim: z.number().int().positive().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const knowledgeBase = await createKnowledgeBase(input);
		return { knowledgeBase };
	});

export const update = protectedProcedure
	.route({
		method: "PATCH",
		path: "/knowledge-bases/{id}",
		tags: ["Knowledge"],
		summary: "Update knowledge base",
	})
	.input(
		z.object({
			id: z.string(),
			name: z.string().optional(),
			description: z.string().nullable().optional(),
			status: z.enum(["ACTIVE", "ARCHIVED", "DELETED"]).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireKb(input.id, context.user.id);
		const { id, ...data } = input;
		return { knowledgeBase: await updateKnowledgeBase(id, data) };
	});

export const createUploadUrl = protectedProcedure
	.route({
		method: "POST",
		path: "/knowledge-bases/{id}/upload-url",
		tags: ["Knowledge"],
		summary: "Create signed upload URL for a knowledge document",
	})
	.input(
		z.object({
			id: z.string(),
			fileName: z.string().min(1),
			contentType: z.string().min(1),
		}),
	)
	.handler(async ({ input, context }) => {
		const kb = await requireKb(input.id, context.user.id);
		const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
		const path = `knowledge/${kb.organizationId}/${input.id}/${nanoid()}-${safeName}`;
		const bucket = getKnowledgeBucket();
		const signedUploadUrl = await createKnowledgeSignedUploadUrl({
			bucket,
			key: path,
			contentType: input.contentType,
		});

		return {
			signedUploadUrl,
			path,
			bucket,
			title: titleFromFileName(input.fileName),
			url: `/image-proxy/${bucket}/${path}`,
		};
	});

export const createDoc = protectedProcedure
	.route({
		method: "POST",
		path: "/knowledge-bases/{id}/documents",
		tags: ["Knowledge"],
		summary: "Create document",
	})
	.input(
		z.object({
			id: z.string(),
			title: z.string().min(1).optional(),
			sourceType: z.enum(["UPLOAD", "URL", "TEXT", "API"]).optional(),
			sourceUrl: z.string().optional(),
			storageKey: z.string().optional(),
			content: z.string().optional(),
			fileName: z.string().optional(),
			contentType: z.string().optional(),
			bucket: z.string().optional(),
			process: z.boolean().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireKb(input.id, context.user.id);

		const sourceType = input.sourceType ?? "UPLOAD";
		const title =
			input.title?.trim() ||
			(sourceType === "URL" && input.sourceUrl
				? titleFromUrl(input.sourceUrl)
				: null) ||
			(sourceType === "TEXT" && input.content
				? titleFromText(input.content)
				: null) ||
			(input.fileName ? titleFromFileName(input.fileName) : null) ||
			"Untitled document";

		const document = await createDocument({
			knowledgeBaseId: input.id,
			title,
			sourceType,
			sourceUrl: input.sourceUrl,
			storageKey: input.storageKey,
			metadata: {
				...(input.fileName ? { fileName: input.fileName } : {}),
				...(input.contentType
					? { contentType: input.contentType }
					: {}),
				bucket: input.bucket ?? getKnowledgeBucket(),
				queuedAt: new Date().toISOString(),
			},
		});

		if (input.process === false) {
			return { document };
		}

		try {
			const result = await processKnowledgeDocument({
				documentId: document.id,
				textContent: sourceType === "TEXT" ? input.content : undefined,
			});
			return {
				document: result.document,
				chunkCount: result.chunkCount,
			};
		} catch (error) {
			const failed = await getDocumentById(document.id);
			return {
				document: failed ?? document,
				error:
					error instanceof Error
						? error.message
						: "Processing failed",
			};
		}
	});

export const processDocument = protectedProcedure
	.route({
		method: "POST",
		path: "/knowledge-bases/documents/{documentId}/process",
		tags: ["Knowledge"],
		summary: "Process document: extract, chunk, embed, and mark ready",
	})
	.input(
		z.object({
			documentId: z.string(),
			textContent: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireDocument(input.documentId, context.user.id);
		try {
			const result = await processKnowledgeDocument(input);
			return {
				document: result.document,
				chunkCount: result.chunkCount,
			};
		} catch (error) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					error instanceof Error
						? error.message
						: "Document processing failed",
			});
		}
	});

export const ingestChunks = protectedProcedure
	.route({
		method: "POST",
		path: "/knowledge-bases/documents/{documentId}/chunks",
		tags: ["Knowledge"],
		summary: "Ingest chunks",
	})
	.input(
		z.object({
			documentId: z.string(),
			chunks: z.array(
				z.object({
					content: z.string(),
					chunkIndex: z.number().int().nonnegative(),
					tokenCount: z.number().int().optional(),
					embedding: z.array(z.number()).optional(),
					metadata: z.record(z.string(), z.unknown()).optional(),
				}),
			),
			markReady: z.boolean().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireDocument(input.documentId, context.user.id);
		const created = await createDocumentChunks(
			input.chunks.map((c) => ({
				documentId: input.documentId,
				content: c.content,
				chunkIndex: c.chunkIndex,
				tokenCount: c.tokenCount,
				embedding: c.embedding,
				metadata: c.metadata as object | undefined,
			})),
		);
		if (input.markReady !== false) {
			await updateDocument(input.documentId, {
				status: "READY",
			});
		}
		return { chunks: created };
	});

export const search = protectedProcedure
	.route({
		method: "POST",
		path: "/knowledge-bases/{id}/search",
		tags: ["Knowledge"],
		summary: "Vector search",
	})
	.input(
		z.object({
			id: z.string(),
			embedding: z.array(z.number()).min(1),
			k: z.number().int().positive().max(50).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireKb(input.id, context.user.id);
		const results = await searchChunks(input.id, input.embedding, input.k);
		return { results };
	});

export const removeDocument = protectedProcedure
	.route({
		method: "DELETE",
		path: "/knowledge-bases/documents/{documentId}",
		tags: ["Knowledge"],
		summary: "Delete document",
	})
	.input(z.object({ documentId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireDocument(input.documentId, context.user.id);
		const document = await deleteDocument(input.documentId);
		return { document };
	});
