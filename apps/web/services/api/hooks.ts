"use client";

import { orpcClient } from "@shared/lib/orpc-client";
import { orpc } from "@shared/lib/orpc-query-utils";
import {
	type UseMutationOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type {
	CreateDocumentInput,
	KnowledgeBaseDetail,
	KnowledgeDocument,
	KnowledgeSource,
	OrgAvatar,
	ToolCreateInput,
	ToolDefinition,
} from "./types";

export function useDashboardStatsQuery(organizationId?: string, days = 30) {
	return useQuery({
		...orpc.dashboard.stats.queryOptions({
			input: {
				organizationId: organizationId ?? "",
				days,
			},
		}),
		enabled: !!organizationId,
		select: (data) => data.stats,
	});
}

export function useDashboardAnalyticsQuery(organizationId: string, days = 7) {
	return useQuery({
		...orpc.dashboard.analytics.queryOptions({
			input: { organizationId, days },
		}),
		enabled: !!organizationId,
		select: (data) => data.analytics,
	});
}

export function useAvatarsQuery(organizationId: string) {
	return useQuery({
		...orpc.avatars.list.queryOptions({
			input: { organizationId },
		}),
		enabled: !!organizationId,
		select: (data): OrgAvatar[] =>
			(data.avatars ?? []).map((avatar) => ({
				id: avatar.id,
				display_name: avatar.name,
				preview_url: avatar.previewUrl ?? null,
				external_avatar_id: avatar.anamAvatarId,
				provider_id: "anam",
				is_enabled: true,
			})),
	});
}

export function useKnowledgeBasesQuery(organizationId: string) {
	return useQuery({
		...orpc.knowledge.list.queryOptions({
			input: { organizationId },
		}),
		enabled: !!organizationId,
		select: (data) =>
			(data.knowledgeBases ?? []).map((kb) => ({
				id: kb.id,
				label: kb.name,
			})),
	});
}

export function useKnowledgeSourcesQuery(organizationId: string | null) {
	return useQuery({
		...orpc.knowledge.list.queryOptions({
			input: { organizationId: organizationId ?? "" },
		}),
		enabled: !!organizationId,
		select: (data): KnowledgeSource[] =>
			(data.knowledgeBases ?? []).map((kb) => ({
				id: kb.id,
				name: kb.name,
				description: kb.description ?? null,
				status: kb.status === "ACTIVE" ? "published" : "draft",
				document_count: kb._count?.documents ?? 0,
			})),
	});
}

export function useCreateKnowledgeSourceMutation(
	organizationId: string | null,
	options?: Pick<
		UseMutationOptions<
			KnowledgeSource,
			Error,
			{ name: string; description?: string }
		>,
		"onSuccess" | "onError"
	>,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			name: string;
			description?: string;
		}): Promise<KnowledgeSource> => {
			if (!organizationId) {
				throw new Error("Organization is required");
			}
			const { knowledgeBase } = await orpcClient.knowledge.create({
				organizationId,
				name: input.name,
				description: input.description,
			});
			return {
				id: knowledgeBase.id,
				name: knowledgeBase.name,
				description: knowledgeBase.description ?? null,
				status: "draft",
				document_count: 0,
			};
		},
		onSuccess: async (data, variables, onMutateResult, context) => {
			if (organizationId) {
				await queryClient.invalidateQueries({
					queryKey: orpc.knowledge.list.key({
						input: { organizationId },
					}),
				});
			}
			await options?.onSuccess?.(data, variables, onMutateResult, context);
		},
		onError: options?.onError,
	});
}

function mapDocument(doc: {
	id: string;
	title: string;
	sourceType: KnowledgeDocument["sourceType"];
	sourceUrl: string | null;
	status: KnowledgeDocument["status"];
	errorMessage: string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
}): KnowledgeDocument {
	return {
		id: doc.id,
		title: doc.title,
		sourceType: doc.sourceType,
		sourceUrl: doc.sourceUrl,
		status: doc.status,
		errorMessage: doc.errorMessage,
		createdAt:
			typeof doc.createdAt === "string"
				? doc.createdAt
				: doc.createdAt.toISOString(),
		updatedAt:
			typeof doc.updatedAt === "string"
				? doc.updatedAt
				: doc.updatedAt.toISOString(),
	};
}

export function useKnowledgeBaseQuery(sourceId: string | null | undefined) {
	const query = useQuery({
		...orpc.knowledge.get.queryOptions({
			input: { id: sourceId ?? "" },
		}),
		enabled: !!sourceId,
		refetchInterval: (current) => {
			const documents = current.state.data?.knowledgeBase.documents ?? [];
			const hasActive = documents.some(
				(doc) =>
					doc.status === "PENDING" || doc.status === "PROCESSING",
			);
			return hasActive ? 3000 : false;
		},
	});

	const data: KnowledgeBaseDetail | undefined = query.data
		? {
				id: query.data.knowledgeBase.id,
				name: query.data.knowledgeBase.name,
				description: query.data.knowledgeBase.description ?? null,
				status: query.data.knowledgeBase.status,
				documents: (query.data.knowledgeBase.documents ?? [])
					.filter((doc) => doc.status !== "DELETED")
					.map(mapDocument),
			}
		: undefined;

	return { ...query, data };
}

export function useCreateDocumentMutation(
	knowledgeBaseId: string,
	options?: Pick<
		UseMutationOptions<KnowledgeDocument, Error, CreateDocumentInput>,
		"onSuccess" | "onError"
	>,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (
			input: CreateDocumentInput,
		): Promise<KnowledgeDocument> => {
			let storageKey: string | undefined;
			let bucket: string | undefined;
			let fileName: string | undefined;
			let contentType: string | undefined;
			let title = input.title?.trim();

			if (input.sourceType === "UPLOAD") {
				if (!input.file) {
					throw new Error("A file is required for upload");
				}
				fileName = input.file.name;
				contentType = input.file.type || "application/octet-stream";
				const upload = await orpcClient.knowledge.createUploadUrl({
					id: knowledgeBaseId,
					fileName,
					contentType,
				});
				const response = await fetch(upload.signedUploadUrl, {
					method: "PUT",
					body: input.file,
					headers: { "Content-Type": contentType },
				});
				if (!response.ok) {
					throw new Error("Failed to upload file");
				}
				storageKey = upload.path;
				bucket = upload.bucket;
				title = title || upload.title;
			}

			const result = await orpcClient.knowledge.createDoc({
				id: knowledgeBaseId,
				title,
				sourceType: input.sourceType,
				sourceUrl: input.sourceUrl,
				storageKey,
				content: input.content,
				fileName,
				contentType,
				bucket,
				process: true,
			});

			const document = result.document;
			if (!document) {
				throw new Error("Document was not created");
			}
			if (
				"error" in result &&
				typeof result.error === "string" &&
				result.error
			) {
				throw new Error(result.error);
			}

			return mapDocument(document);
		},
		onSuccess: async (data, variables, onMutateResult, context) => {
			await queryClient.invalidateQueries({
				queryKey: orpc.knowledge.get.key({
					input: { id: knowledgeBaseId },
				}),
			});
			await queryClient.invalidateQueries({
				queryKey: orpc.knowledge.list.key(),
			});
			await options?.onSuccess?.(data, variables, onMutateResult, context);
		},
		onError: options?.onError,
	});
}

export function useDeleteDocumentMutation(
	knowledgeBaseId: string,
	options?: Pick<
		UseMutationOptions<KnowledgeDocument, Error, string>,
		"onSuccess" | "onError"
	>,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (documentId: string): Promise<KnowledgeDocument> => {
			const { document } = await orpcClient.knowledge.removeDocument({
				documentId,
			});
			return mapDocument(document);
		},
		onSuccess: async (data, variables, onMutateResult, context) => {
			await queryClient.invalidateQueries({
				queryKey: orpc.knowledge.get.key({
					input: { id: knowledgeBaseId },
				}),
			});
			await queryClient.invalidateQueries({
				queryKey: orpc.knowledge.list.key(),
			});
			await options?.onSuccess?.(data, variables, onMutateResult, context);
		},
		onError: options?.onError,
	});
}

export function useProvidersQuery() {
	return useQuery({
		...orpc.catalog.listProviders.queryOptions({ input: undefined }),
		select: (data) => data.providers,
	});
}

export function useProviderModelsQuery(
	kind: "llm" | "realtime" | "stt" | "tts",
) {
	return useQuery({
		...orpc.catalog.listModels.queryOptions({
			input: { kind },
		}),
		select: (data) => data.models,
	});
}

export function useProviderVoicesQuery(
	providerModelId: string | null | undefined,
) {
	return useQuery({
		...orpc.catalog.listVoices.queryOptions({
			input: { providerModelId: providerModelId ?? undefined },
		}),
		enabled: !!providerModelId,
		select: (data) => data.voices,
	});
}

export function useLanguagesQuery() {
	return useQuery({
		...orpc.catalog.listLanguages.queryOptions({ input: undefined }),
		select: (data) => data.languages,
	});
}

export function useTimezonesQuery() {
	return useQuery({
		...orpc.catalog.listTimezones.queryOptions({ input: undefined }),
		select: (data) => data.timezones,
	});
}

export function useToolsQuery(organizationId: string) {
	return useQuery({
		...orpc.tools.list.queryOptions({
			input: { organizationId },
		}),
		enabled: !!organizationId,
		select: (data): ToolDefinition[] => data.tools,
	});
}

export function useCreateToolMutation(
	organizationId: string,
	options?: Pick<
		UseMutationOptions<ToolDefinition, Error, ToolCreateInput>,
		"onSuccess" | "onError"
	>,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: ToolCreateInput) => {
			const { tool } = await orpcClient.tools.create({
				organizationId,
				...input,
			});
			return tool;
		},
		onSuccess: async (data, variables, onMutateResult, context) => {
			await queryClient.invalidateQueries({
				queryKey: orpc.tools.list.key({
					input: { organizationId },
				}),
			});
			await options?.onSuccess?.(data, variables, onMutateResult, context);
		},
		onError: options?.onError,
	});
}

export type AgentVersionSummary = {
	id: string;
	is_draft: boolean;
	config: Record<string, unknown>;
};

export type AgentSummary = {
	id: string;
	name: string;
	published_version_id: string | null;
};

export function useAgentQuery(
	organizationId: string | null | undefined,
	agentId: string,
) {
	const query = useQuery({
		...orpc.agents.get.queryOptions({
			input: { id: agentId },
		}),
		enabled: !!organizationId && !!agentId,
	});

	const data: AgentSummary | undefined = query.data
		? {
				id: query.data.agent.id,
				name: query.data.agent.name,
				published_version_id: query.data.agent.publishedVersionId ?? null,
			}
		: undefined;

	return { ...query, data };
}

export function useAgentVersionsQuery(
	organizationId: string | null | undefined,
	agentId: string,
) {
	const query = useQuery({
		...orpc.agents.get.queryOptions({
			input: { id: agentId },
		}),
		enabled: !!organizationId && !!agentId,
	});

	const data: AgentVersionSummary[] | undefined = query.data
		? (query.data.agent.versions ?? []).map((version) => ({
				id: version.id,
				is_draft: version.isDraft,
				config: (version.config ?? {}) as Record<string, unknown>,
			}))
		: undefined;

	return { ...query, data };
}

export function useUpdateAgentVersionMutation(
	organizationId: string | null | undefined,
	agentId: string,
	_versionId: string,
	options?: Pick<
		UseMutationOptions<
			unknown,
			Error,
			{ config: Record<string, unknown> }
		>,
		"onSuccess" | "onError"
	>,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: { config: Record<string, unknown> }) => {
			if (!organizationId) {
				throw new Error("Organization is required");
			}
			const { version } = await orpcClient.agents.updateConfig({
				id: agentId,
				config: input.config as {
					knowledgeBaseIds: string[];
					[key: string]: unknown;
				},
			});
			return version;
		},
		onSuccess: async (data, variables, onMutateResult, context) => {
			await queryClient.invalidateQueries({
				queryKey: orpc.agents.get.key({ input: { id: agentId } }),
			});
			await options?.onSuccess?.(data, variables, onMutateResult, context);
		},
		onError: options?.onError,
	});
}

export function usePublishAgentVersionMutation(
	organizationId: string | null | undefined,
	agentId: string,
	options?: Pick<
		UseMutationOptions<unknown, Error, string>,
		"onSuccess" | "onError"
	>,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (_versionId: string) => {
			if (!organizationId) {
				throw new Error("Organization is required");
			}
			const { agent } = await orpcClient.agents.publish({ id: agentId });
			return agent;
		},
		onSuccess: async (data, variables, onMutateResult, context) => {
			await queryClient.invalidateQueries({
				queryKey: orpc.agents.get.key({ input: { id: agentId } }),
			});
			await options?.onSuccess?.(data, variables, onMutateResult, context);
		},
		onError: options?.onError,
	});
}
