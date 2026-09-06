import {
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

function extractHistoryItems(report: unknown): unknown[] {
	const root = asRecord(report);
	if (!root) return [];

	const candidates = [
		root.chat_history,
		root.history,
		asRecord(root.history)?.items,
		asRecord(root.conversation)?.items,
		root.messages,
	];

	for (const candidate of candidates) {
		if (Array.isArray(candidate)) return candidate;
	}
	return [];
}

export function transcriptSegmentsFromReport(
	report: unknown,
): TranscriptSegmentInput[] {
	const items = extractHistoryItems(report);
	const segments: TranscriptSegmentInput[] = [];

	for (const item of items) {
		const row = asRecord(item);
		if (!row) continue;

		const text =
			str(row.content) ||
			str(row.text) ||
			(Array.isArray(row.content)
				? row.content
						.map((part) => {
							const p = asRecord(part);
							return str(p?.text) || str(part);
						})
						.filter(Boolean)
						.join(" ")
				: "");

		if (!text && mapRole(row.role) !== "TOOL") continue;

		segments.push({
			sequence: segments.length,
			role: mapRole(row.role ?? row.type),
			text,
			speakerIdentity: str(row.speaker_identity || row.id) || undefined,
			startMs:
				typeof row.created_at === "number"
					? Math.floor(row.created_at)
					: undefined,
			isFinal: true,
			livekitMessageId: str(row.id) || undefined,
			metrics: asJson(row.metrics),
		});
	}

	return segments;
}

function mapModality(value: unknown): UsageModality {
	const m = str(value).toLowerCase();
	if (m.includes("realtime")) return "REALTIME";
	if (m.includes("stt") || m.includes("speech-to-text")) return "STT";
	if (m.includes("tts") || m.includes("text-to-speech")) return "TTS";
	if (m.includes("vad")) return "VAD";
	if (m.includes("avatar")) return "AVATAR";
	if (m.includes("sip")) return "SIP";
	if (m.includes("egress")) return "EGRESS";
	if (m.includes("room")) return "LIVEKIT_ROOM";
	return "LLM";
}

type UsageRow = {
	modality: UsageModality;
	provider: string;
	model: string;
	inputTokens?: number;
	outputTokens?: number;
	inputCachedTokens?: number;
	inputAudioTokens?: number;
	inputTextTokens?: number;
	outputAudioTokens?: number;
	outputTextTokens?: number;
	charactersCount?: number;
	audioDurationMs?: number;
	providerSessionDurationMs?: number;
	raw: Record<string, unknown>;
};

function usageRowsFromPayload(usage: unknown): UsageRow[] {
	const root = asRecord(usage);
	if (!root) return [];

	const modelUsage =
		root.model_usage ??
		root.modelUsage ??
		(Array.isArray(usage) ? usage : null);

	const list = Array.isArray(modelUsage)
		? modelUsage
		: Array.isArray(root.models)
			? root.models
			: [];

	const rows: UsageRow[] = [];
	for (const item of list) {
		const row = asRecord(item);
		if (!row) continue;
		const provider = str(row.provider, "unknown");
		const model = str(row.model ?? row.model_name, "unknown");
		rows.push({
			modality: mapModality(row.modality ?? row.type ?? row.kind),
			provider,
			model,
			inputTokens: num(
				row.input_tokens ?? row.prompt_tokens ?? row.inputTokens,
			),
			outputTokens: num(
				row.output_tokens ??
					row.completion_tokens ??
					row.outputTokens,
			),
			inputCachedTokens: num(
				row.input_cached_tokens ?? row.cached_tokens,
			),
			inputAudioTokens: num(row.input_audio_tokens),
			inputTextTokens: num(row.input_text_tokens),
			outputAudioTokens: num(row.output_audio_tokens),
			outputTextTokens: num(row.output_text_tokens),
			charactersCount: num(row.characters ?? row.characters_count),
			audioDurationMs: num(
				row.audio_duration_ms ??
					(typeof row.audio_duration === "number"
						? row.audio_duration * 1000
						: 0),
			),
			providerSessionDurationMs: num(
				row.provider_session_duration_ms ?? row.duration_ms,
			),
			raw: row,
		});
	}

	return rows;
}

export async function persistSessionArtifacts(opts: {
	organizationId: string;
	sessionId: string;
	agentId: string;
	report: unknown;
	usage?: unknown;
	isFinal?: boolean;
}) {
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

	const usageRows = usageRowsFromPayload(
		opts.usage ?? asRecord(opts.report)?.usage,
	);
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
				inputAudioTokens: row.inputAudioTokens,
				inputTextTokens: row.inputTextTokens,
				outputAudioTokens: row.outputAudioTokens,
				outputTextTokens: row.outputTextTokens,
				charactersCount: row.charactersCount,
				audioDurationMs: row.audioDurationMs,
				providerSessionDurationMs: row.providerSessionDurationMs,
				raw: row.raw,
				isFinal: opts.isFinal ?? true,
			}),
		);
	}

	return { transcript, usages };
}
