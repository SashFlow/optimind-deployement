import type { SessionPrejoinMediaSelection } from "./SessionPrejoinLobby";

/**
 * Maps prejoin mic choice to LiveKitRoom `audio`.
 * Pass deviceId as a string so the SDK can retry with `ideal` if `exact` fails.
 */
export function resolveLiveKitAudioOption(
	joinMedia: SessionPrejoinMediaSelection | null | undefined,
): boolean | { deviceId: string } {
	if (!joinMedia?.micEnabled) {
		return false;
	}
	if (joinMedia.audioDeviceId) {
		return { deviceId: joinMedia.audioDeviceId };
	}
	return true;
}

/**
 * Maps prejoin camera choice to LiveKitRoom `video`.
 * When a live prefetched track is present, return false — publish it via
 * PublishPrefetchedCamera instead of reopening the device.
 */
export function resolveLiveKitVideoOption(
	joinMedia: SessionPrejoinMediaSelection | null | undefined,
): boolean | { deviceId: string } {
	if (!joinMedia?.cameraEnabled) {
		return false;
	}
	if (joinMedia.cameraTrack) {
		return false;
	}
	if (joinMedia.videoDeviceId) {
		return { deviceId: joinMedia.videoDeviceId };
	}
	return true;
}

export function releasePrefetchedCameraTrack(
	joinMedia: SessionPrejoinMediaSelection | null | undefined,
) {
	const track = joinMedia?.cameraTrack;
	if (track && track.readyState !== "ended") {
		track.stop();
	}
}
