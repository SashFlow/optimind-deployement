import {
	createSessionEvent,
	createToolCallRecord,
	type TranscriptSegmentInput,
	upsertSessionUsage,
	upsertTranscriptFromHistory,
} from "@repo/database";

type TranscriptRole = TranscriptSegmentInput["role"];
type UsageModality =
	| "LLM"
	| "REALTIME"
	| "STT"
	| "TTS"
	| "VAD"
	| "AVATAR"
	| "SIP"
	| "LIVEKIT_ROOM"
	| "EGRESS";

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

function asJson(value: unknown): Record<string, unknown> {
	return asRecord(value) ?? {};
}

function num(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function mapRole(role: unknown): TranscriptRole {
	const r = str(role).toLowerCase();
	if (r === "assistant" || r === "agent" || r === "bot") return "ASSISTANT";
	if (r === "system") return "SYSTEM";
	if (r === "tool" || r === "function") return "TOOL";
	return "USER";
}

function flattenContent(value: unknown): string {
	if (typeof value === "string") return value.trim();
	if (Array.isArray(value)) {
		return value
			.map((part) => {
				if (typeof part === "string") return part;
				const p = asRecord(part);
				return str(p?.text) || str(p?.transcript) || "";
			})
			.filter(Boolean)
			.join(" ")
			.trim();
	}
	const row = asRecord(value);
	if (!row) return "";
	return flattenContent(row.text ?? row.content ?? row.transcript);
}

function toAbsoluteMs(value: unknown): number | undefined {
	if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
	// Epoch ms (~1.7e12), epoch seconds (~1.7e9), or relative seconds.
	if (value > 1e12) return Math.floor(value);
	if (value > 1e9) return Math.floor(value * 1000);
	return Math.floor(value * 1000);
}

/** Clamp to signed INT4 range used by Postgres `Int`. */
function toInt4Ms(value: number | undefined): number | undefined {
	if (value === undefined || !Number.isFinite(value)) return undefined;
	const floored = Math.floor(value);
	if (floored < 0) return 0;
	if (floored > 2_147_483_647) return 2_147_483_647;
	return floored;
}

function extractHistoryItems(report: unknown): unknown[] {
	const root = asRecord(report);
	if (!root) return [];

	const candidates = [
		asRecord(root.chat_history)?.items,
		root.chat_history,
		asRecord(root.history)?.items,
		root.history,
		asRecord(root.conversation)?.items,
		root.messages,
	];

	for (const candidate of candidates) {
		if (Array.isArray(candidate)) return candidate;
	}
	return [];
}

export function isMetricsOnlyReport(report: unknown): boolean {
	const root = asRecord(report);
	if (!root) return true;
	if (root.metrics_flush === true) return true;
	const keys = Object.keys(root);
	if (keys.length === 0) return true;
	if (keys.every((k) => k === "metrics_flush" || k === "metrics")) {
		return true;
	}
	return false;
}

export function mergeSessionReports(
	existing: unknown,
	incoming: unknown,
): Record<string, unknown> {
	const prev = asRecord(existing) ?? {};
	const next = asRecord(incoming) ?? {};

	if (isMetricsOnlyReport(next) && !isMetricsOnlyReport(prev)) {
		const mergedMetrics = [
			...(Array.isArray(prev.metrics) ? prev.metrics : []),
			...(Array.isArray(next.metrics) ? next.metrics : []),
		];
		return {
			...prev,
			...(mergedMetrics.length ? { metrics: mergedMetrics } : {}),
			metrics_flush: next.metrics_flush ?? prev.metrics_flush,
		};
	}

	const prevHistory = asRecord(prev.chat_history);
	const nextHistory = asRecord(next.chat_history);
	const chatHistory =
		nextHistory &&
		Array.isArray(nextHistory.items) &&
		nextHistory.items.length
			? nextHistory
			: prevHistory && Array.isArray(prevHistory.items)
				? prevHistory
				: (next.chat_history ?? prev.chat_history);

	return {
		...prev,
		...next,
		chat_history: chatHistory,
		events:
			Array.isArray(next.events) && next.events.length > 0
				? next.events
				: (prev.events ?? next.events),
		usage: next.usage ?? prev.usage,
	};
}

export function transcriptSegmentsFromReport(
	report: unknown,
): TranscriptSegmentInput[] {
	const items = extractHistoryItems(report);
	const prepared: Array<{
		row: Record<string, unknown>;
		role: TranscriptRole;
		text: string;
		absoluteMs?: number;
	}> = [];

	for (const item of items) {
		const row = asRecord(item);
		if (!row) continue;

		const itemType = str(row.type).toLowerCase();
		if (
			itemType &&
			itemType !== "message" &&
			itemType !== "user" &&
			itemType !== "assistant"
		) {
			// Skip non-message history items (tools handled separately).
			if (
				itemType === "function_call" ||
				itemType === "function_call_output" ||
				itemType === "agent_handoff" ||
				itemType === "agent_config_update"
			) {
				continue;
			}
		}

		const role = mapRole(row.role ?? row.type);
		const text =
			flattenContent(row.content) ||
			flattenContent(row.text) ||
			flattenContent(row.text_content);

		if (!text && role !== "TOOL") continue;
		// Skip empty system prompts that only carry instructions noise.
		if (role === "SYSTEM" && !text) continue;

		prepared.push({
			row,
			role,
			text,
			absoluteMs: toAbsoluteMs(row.created_at ?? row.createdAt),
		});
	}

	// startMs/endMs are INT4 offsets within the session — never absolute epoch ms.
	const originMs = prepared.reduce<number | undefined>((min, item) => {
		if (item.absoluteMs === undefined) return min;
		if (min === undefined) return item.absoluteMs;
		return Math.min(min, item.absoluteMs);
	}, undefined);

	const segments: TranscriptSegmentInput[] = [];
	for (const item of prepared) {
		let startMs: number | undefined;
		if (item.absoluteMs !== undefined && originMs !== undefined) {
			startMs = toInt4Ms(item.absoluteMs - originMs);
		} else if (item.absoluteMs !== undefined && item.absoluteMs < 1e9) {
			// Already a relative ms value from a short-session timestamp.
			startMs = toInt4Ms(item.absoluteMs);
		}

		segments.push({
			sequence: segments.length,
			role: item.role,
			text: item.text,
			speakerIdentity:
				str(item.row.speaker_identity || item.row.id) || undefined,
			startMs,
			isFinal: true,
			interrupted: Boolean(item.row.interrupted),
			livekitMessageId: str(item.row.id) || undefined,
			metrics: asJson(item.row.metrics),
		});
	}

	return segments;
}

function mapModality(value: unknown): UsageModality {
	const m = str(value).toLowerCase();
	if (m.includes("realtime") || m.includes("gptlive") || m.includes("gpt-live"))
		return "REALTIME";
	if (m.includes("stt") || m.includes("speech-to-text")) return "STT";
	if (m.includes("tts") || m.includes("text-to-speech")) return "TTS";
	if (m.includes("vad")) return "VAD";
	if (m.includes("avatar")) return "AVATAR";
	if (m.includes("sip")) return "SIP";
	if (m.includes("egress")) return "EGRESS";
	if (m.includes("room")) return "LIVEKIT_ROOM";
	if (m.includes("llm") || m.includes("language")) return "LLM";
	// Infer from typical class / type names in model dumps
	if (m.includes("ttsm")) return "TTS";
	if (m.includes("sttm")) return "STT";
	return "LLM";
}

type UsageRow = {
	modality: UsageModality;
	provider: string;
	model: string;
	inputTokens?: number;
	outputTokens?: number;
	inputCachedTokens?: number;
	inputCachedAudioTokens?: number;
	inputCachedTextTokens?: number;
	inputCachedImageTokens?: number;
	inputAudioTokens?: number;
	inputTextTokens?: number;
	inputImageTokens?: number;
	outputAudioTokens?: number;
	outputTextTokens?: number;
	charactersCount?: number;
	audioDurationMs?: number;
	providerSessionDurationMs?: number;
	totalRequests?: number;
	raw: Record<string, unknown>;
};

function usageListFromPayload(usage: unknown): unknown[] {
	if (Array.isArray(usage)) return usage;

	const root = asRecord(usage);
	if (!root) return [];

	const modelUsage =
		root.model_usage ?? root.modelUsage ?? root.models ?? null;
	if (Array.isArray(modelUsage)) return modelUsage;
	return [];
}

function usageRowsFromPayload(usage: unknown): UsageRow[] {
	const list = usageListFromPayload(usage);
	const rows: UsageRow[] = [];

	for (const item of list) {
		const row = asRecord(item);
		if (!row) continue;
		const provider = str(row.provider, "unknown");
		const model = str(row.model ?? row.model_name, "unknown");
		const typeName = str(row.type ?? row.kind ?? row.__class__);
		rows.push({
			modality: mapModality(
				row.modality ?? (typeName || `${provider}/${model}`),
			),
			provider,
			model,
			inputTokens: num(
				row.input_tokens ?? row.prompt_tokens ?? row.inputTokens,
			),
			outputTokens: num(
				row.output_tokens ?? row.completion_tokens ?? row.outputTokens,
			),
			inputCachedTokens: num(
				row.input_cached_tokens ?? row.cached_tokens,
			),
			inputCachedAudioTokens: num(row.input_cached_audio_tokens),
			inputCachedTextTokens: num(row.input_cached_text_tokens),
			inputCachedImageTokens: num(row.input_cached_image_tokens),
			inputAudioTokens: num(row.input_audio_tokens),
			inputTextTokens: num(row.input_text_tokens),
			inputImageTokens: num(row.input_image_tokens),
			outputAudioTokens: num(row.output_audio_tokens),
			outputTextTokens: num(row.output_text_tokens),
			charactersCount: num(row.characters_count ?? row.characters),
			audioDurationMs: num(
				row.audio_duration_ms ??
					(typeof row.audio_duration === "number"
						? row.audio_duration * 1000
						: 0),
			),
			providerSessionDurationMs: num(
				row.provider_session_duration_ms ??
					row.duration_ms ??
					(typeof row.session_duration === "number"
						? row.session_duration * 1000
						: 0),
			),
			totalRequests: num(row.total_requests ?? row.num_requests),
			raw: row,
		});
	}

	return rows;
}

function parseToolArguments(value: unknown): Record<string, unknown> {
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			return asRecord(parsed) ?? { raw: value };
		} catch {
			return { raw: value };
		}
	}
	return asRecord(value) ?? {};
}

export function toolCallsFromReport(report: unknown): Array<{
	toolName: string;
	arguments: Record<string, unknown>;
	result: Record<string, unknown>;
	status: "COMPLETED" | "FAILED";
	error?: string;
}> {
	const items = extractHistoryItems(report);
	const pending = new Map<
		string,
		{ toolName: string; arguments: Record<string, unknown> }
	>();
	const completed: Array<{
		toolName: string;
		arguments: Record<string, unknown>;
		result: Record<string, unknown>;
		status: "COMPLETED" | "FAILED";
		error?: string;
	}> = [];

	for (const item of items) {
		const row = asRecord(item);
		if (!row) continue;
		const type = str(row.type).toLowerCase();

		if (type === "function_call") {
			const callId = str(row.call_id || row.id);
			pending.set(callId, {
				toolName: str(row.name || row.tool_name, "unknown_tool"),
				arguments: parseToolArguments(row.arguments ?? row.args),
			});
			continue;
		}

		if (type === "function_call_output") {
			const callId = str(row.call_id || row.id);
			const base = pending.get(callId) ?? {
				toolName: str(row.name || row.tool_name, "unknown_tool"),
				arguments: {},
			};
			pending.delete(callId);
			const isError = Boolean(row.is_error ?? row.isError);
			const output =
				typeof row.output === "string"
					? { text: row.output }
					: (asRecord(row.output) ?? { value: row.output });
			completed.push({
				toolName: base.toolName,
				arguments: base.arguments,
				result: output,
				status: isError ? "FAILED" : "COMPLETED",
				error: isError ? str(row.output) || "tool error" : undefined,
			});
		}
	}

	for (const leftover of pending.values()) {
		completed.push({
			...leftover,
			result: {},
			status: "COMPLETED",
		});
	}

	return completed;
}

export async function persistSessionArtifacts(opts: {
	organizationId: string;
	sessionId: string;
	agentId: string;
	report: unknown;
	usage?: unknown;
	metrics?: unknown[];
	isFinal?: boolean;
}) {
	const reportRoot = asRecord(opts.report);
	const segments = transcriptSegmentsFromReport(opts.report);
	let transcript = null;
	if (segments.length > 0) {
		transcript = await upsertTranscriptFromHistory({
			organizationId: opts.organizationId,
			sessionId: opts.sessionId,
			agentId: opts.agentId,
			status: opts.isFinal === false ? "PARTIAL" : "FINAL",
			segments,
		});
	}

	const usageSource =
		opts.usage ?? reportRoot?.usage ?? reportRoot?.model_usage;
	const usageRows = usageRowsFromPayload(usageSource);
	const usages = [];
	for (const row of usageRows) {
		usages.push(
			await upsertSessionUsage({
				organizationId: opts.organizationId,
				sessionId: opts.sessionId,
				agentId: opts.agentId,
				modality: row.modality,
				provider: row.provider,
				model: row.model,
				inputTokens: row.inputTokens,
				outputTokens: row.outputTokens,
				inputCachedTokens: row.inputCachedTokens,
				inputCachedAudioTokens: row.inputCachedAudioTokens,
				inputCachedTextTokens: row.inputCachedTextTokens,
				inputCachedImageTokens: row.inputCachedImageTokens,
				inputAudioTokens: row.inputAudioTokens,
				inputTextTokens: row.inputTextTokens,
				inputImageTokens: row.inputImageTokens,
				outputAudioTokens: row.outputAudioTokens,
				outputTextTokens: row.outputTextTokens,
				charactersCount: row.charactersCount,
				audioDurationMs: row.audioDurationMs,
				providerSessionDurationMs: row.providerSessionDurationMs,
				totalRequests: row.totalRequests,
				raw: row.raw,
				isFinal: opts.isFinal ?? true,
			}),
		);
	}

	const toolCalls = [];
	for (const tool of toolCallsFromReport(opts.report)) {
		toolCalls.push(
			await createToolCallRecord({
				organizationId: opts.organizationId,
				sessionId: opts.sessionId,
				toolName: tool.toolName,
				arguments: tool.arguments,
				result: tool.result,
				status: tool.status,
				error: tool.error,
			}),
		);
	}

	const events = [];
	const reportEvents = Array.isArray(reportRoot?.events)
		? reportRoot.events
		: [];
	for (const event of reportEvents) {
		const row = asRecord(event);
		if (!row) continue;
		const eventType = str(
			row.type ?? row.event_type ?? row.eventType,
			"event",
		);
		if (eventType === "metrics_collected") continue;
		events.push(
			await createSessionEvent({
				organizationId: opts.organizationId,
				sessionId: opts.sessionId,
				eventType: `agent.event.${eventType}`,
				actor: "WORKER",
				payload: row,
			}),
		);
	}

	if (opts.metrics?.length) {
		for (const metric of opts.metrics) {
			const row = asRecord(metric) ?? { value: metric };
			events.push(
				await createSessionEvent({
					organizationId: opts.organizationId,
					sessionId: opts.sessionId,
					eventType: `agent.metric.${String(row.type ?? row.name ?? "metric")}`,
					actor: "WORKER",
					payload: row,
				}),
			);
		}
	}

	return { transcript, usages, toolCalls, events };
}
