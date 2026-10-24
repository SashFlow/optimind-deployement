import type {
	SessionCallType,
	SessionLocationTracking,
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
		face_verification: false,
		body_verification: false,
		body_capture_interval_seconds: 5,
	},
	otp_input: {
		enabled: false,
	},
	location_tracking: "disabled",
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

function asLocationTracking(
	value: unknown,
	fallback: SessionLocationTracking,
): SessionLocationTracking {
	return value === "disabled" || value === "optional" || value === "mandatory"
		? value
		: fallback;
}

/** Clamp body framing context interval to a safe range (seconds). */
export function clampBodyCaptureIntervalSeconds(value: unknown): number {
	const n =
		typeof value === "number" && Number.isFinite(value)
			? value
			: DEFAULT_SESSION_MODALITIES.proctoring
					.body_capture_interval_seconds;
	return Math.min(30, Math.max(2, Math.round(n)));
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
	const otpInputRaw =
		source.otp_input &&
		typeof source.otp_input === "object" &&
		!Array.isArray(source.otp_input)
			? (source.otp_input as Record<string, unknown>)
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
			face_verification: Boolean(
				proctoringRaw.face_verification ??
					DEFAULT_SESSION_MODALITIES.proctoring.face_verification,
			),
			body_verification: Boolean(
				proctoringRaw.body_verification ??
					DEFAULT_SESSION_MODALITIES.proctoring.body_verification,
			),
			body_capture_interval_seconds: clampBodyCaptureIntervalSeconds(
				proctoringRaw.body_capture_interval_seconds ??
					DEFAULT_SESSION_MODALITIES.proctoring
						.body_capture_interval_seconds,
			),
		},
		otp_input: {
			enabled: Boolean(
				otpInputRaw.enabled ??
					DEFAULT_SESSION_MODALITIES.otp_input.enabled,
			),
		},
		location_tracking: asLocationTracking(
			source.location_tracking,
			DEFAULT_SESSION_MODALITIES.location_tracking,
		),
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

/** True when the session needs the shared camera provider (proctoring and/or capture). */
export function hasCameraSessionFeatures(
	proctoring: SessionModalitiesConfig["proctoring"],
) {
	return (
		proctoring.enabled ||
		proctoring.id_verification ||
		proctoring.face_verification ||
		proctoring.body_verification
	);
}

export function formatRemainingDuration(totalSeconds: number): string {
	const clamped = Math.max(0, Math.floor(totalSeconds));
	const minutes = Math.floor(clamped / 60);
	const seconds = clamped % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
