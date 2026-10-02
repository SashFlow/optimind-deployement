import type {
	SessionCallType,
	SessionModalitiesConfig,
	SessionTrackRequirement,
} from "@/lib/agent-config";

export const DEFAULT_SESSION_MODALITIES: SessionModalitiesConfig = {
	call_type: "web",
	audio_track: "mandatory",
	video_track: "optional",
	chat: "optional",
	memory: true,
	proctoring: {
		enabled: false,
		proactive_response: false,
		id_verification: false,
	},
};

function asTrackRequirement(
	value: unknown,
	fallback: SessionTrackRequirement,
): SessionTrackRequirement {
	return value === "mandatory" || value === "optional" ? value : fallback;
}

function asCallType(
	value: unknown,
	fallback: SessionCallType,
): SessionCallType {
	return value === "phone" || value === "web" || value === "both"
		? value
		: fallback;
}

export function normalizeSessionModalities(
	raw: unknown,
): SessionModalitiesConfig {
	const source =
		raw && typeof raw === "object" && !Array.isArray(raw)
			? (raw as Record<string, unknown>)
			: {};
	const proctoringRaw =
		source.proctoring &&
		typeof source.proctoring === "object" &&
		!Array.isArray(source.proctoring)
			? (source.proctoring as Record<string, unknown>)
			: {};

	return {
		call_type: asCallType(
			source.call_type,
			DEFAULT_SESSION_MODALITIES.call_type,
		),
		audio_track: asTrackRequirement(
			source.audio_track,
			DEFAULT_SESSION_MODALITIES.audio_track,
		),
		video_track: asTrackRequirement(
			source.video_track,
			DEFAULT_SESSION_MODALITIES.video_track,
		),
		chat: asTrackRequirement(source.chat, DEFAULT_SESSION_MODALITIES.chat),
		memory:
			typeof source.memory === "boolean"
				? source.memory
				: DEFAULT_SESSION_MODALITIES.memory,
		proctoring: {
			enabled: Boolean(
				proctoringRaw.enabled ??
					DEFAULT_SESSION_MODALITIES.proctoring.enabled,
			),
			proactive_response: Boolean(
				proctoringRaw.proactive_response ??
					DEFAULT_SESSION_MODALITIES.proctoring.proactive_response,
			),
			id_verification: Boolean(
				proctoringRaw.id_verification ??
					DEFAULT_SESSION_MODALITIES.proctoring.id_verification,
			),
		},
	};
}

export function resolvePreviewMedia(
	callType: SessionCallType,
	preferred: "web" | "phone" = "web",
): "web" | "phone" {
	if (callType === "web") {
		return "web";
	}
	if (callType === "phone") {
		return "phone";
	}
	return preferred;
}

export function isTrackMandatory(requirement: SessionTrackRequirement) {
	return requirement === "mandatory";
}

export function formatRemainingDuration(totalSeconds: number): string {
	const clamped = Math.max(0, Math.floor(totalSeconds));
	const minutes = Math.floor(clamped / 60);
	const seconds = clamped % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
