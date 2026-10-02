"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type LocalPreviewMedia = {
	micEnabled: boolean;
	cameraEnabled: boolean;
	audioDeviceId: string;
	videoDeviceId: string;
	audioOutputDeviceId: string;
	audioDevices: MediaDeviceInfo[];
	videoDevices: MediaDeviceInfo[];
	outputDevices: MediaDeviceInfo[];
	permissionPending: "mic" | "camera" | null;
	videoStream: MediaStream | null;
	setAudioDeviceId: (id: string) => void;
	setVideoDeviceId: (id: string) => void;
	setAudioOutputDeviceId: (id: string) => void;
	toggleMic: () => Promise<void>;
	toggleCamera: () => Promise<void>;
	stopPreview: () => void;
	/**
	 * Detach the live camera track without stopping it so LiveKit can publish
	 * the same capture into the room (avoids a black flash / re-prompt).
	 */
	transferCameraTrack: () => MediaStreamTrack | null;
	/** Re-attach a previously transferred track after a failed session start. */
	adoptCameraTrack: (track: MediaStreamTrack) => void;
	refreshDevices: () => Promise<void>;
};

function stopStream(stream: MediaStream | null) {
	if (!stream) {
		return;
	}
	for (const track of stream.getTracks()) {
		track.stop();
	}
}

export function useLocalPreviewMedia(options?: {
	enabled?: boolean;
}): LocalPreviewMedia {
	const enabled = options?.enabled ?? true;
	const [micEnabled, setMicEnabled] = useState(false);
	const [cameraEnabled, setCameraEnabled] = useState(false);
	const [audioDeviceId, setAudioDeviceId] = useState("");
	const [videoDeviceId, setVideoDeviceId] = useState("");
	const [audioOutputDeviceId, setAudioOutputDeviceId] = useState("");
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
	const [permissionPending, setPermissionPending] = useState<
		"mic" | "camera" | null
	>(null);
	const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

	const pendingRef = useRef(false);
	const videoStreamRef = useRef<MediaStream | null>(null);
	const audioProbeRef = useRef<MediaStream | null>(null);
	const audioDeviceIdRef = useRef(audioDeviceId);
	const videoDeviceIdRef = useRef(videoDeviceId);

	audioDeviceIdRef.current = audioDeviceId;
	videoDeviceIdRef.current = videoDeviceId;

	const refreshDevices = useCallback(async () => {
		if (
			typeof navigator === "undefined" ||
			!navigator.mediaDevices?.enumerateDevices
		) {
			return;
		}
		const devices = await navigator.mediaDevices.enumerateDevices();
		const mics = devices.filter(
			(device) => device.kind === "audioinput" && device.deviceId,
		);
		const cameras = devices.filter(
			(device) => device.kind === "videoinput" && device.deviceId,
		);
		const outputs = devices.filter(
			(device) => device.kind === "audiooutput" && device.deviceId,
		);
		setAudioDevices(mics);
		setVideoDevices(cameras);
		setOutputDevices(outputs);
		setAudioDeviceId((current) =>
			current && mics.some((device) => device.deviceId === current)
				? current
				: (mics[0]?.deviceId ?? ""),
		);
		setVideoDeviceId((current) =>
			current && cameras.some((device) => device.deviceId === current)
				? current
				: (cameras[0]?.deviceId ?? ""),
		);
		setAudioOutputDeviceId((current) =>
			current && outputs.some((device) => device.deviceId === current)
				? current
				: (outputs[0]?.deviceId ?? ""),
		);
	}, []);

	const stopPreview = useCallback(() => {
		stopStream(videoStreamRef.current);
		videoStreamRef.current = null;
		setVideoStream(null);
		setCameraEnabled(false);
		stopStream(audioProbeRef.current);
		audioProbeRef.current = null;
	}, []);

	const transferCameraTrack = useCallback(() => {
		const stream = videoStreamRef.current;
		const track = stream?.getVideoTracks()[0] ?? null;
		// Drop cleanup ownership so unmount won't stop the track, but leave
		// React state alone so the lobby preview stays live until it unmounts.
		videoStreamRef.current = null;
		stopStream(audioProbeRef.current);
		audioProbeRef.current = null;
		return track && track.readyState === "live" ? track : null;
	}, []);

	const adoptCameraTrack = useCallback((track: MediaStreamTrack) => {
		if (track.readyState !== "live") {
			return;
		}
		const previous = videoStreamRef.current;
		if (previous) {
			const previousTrack = previous.getVideoTracks()[0];
			if (previousTrack && previousTrack !== track) {
				stopStream(previous);
			}
		}
		const stream = new MediaStream([track]);
		videoStreamRef.current = stream;
		setVideoStream(stream);
		setCameraEnabled(true);
		const trackDeviceId = track.getSettings().deviceId;
		if (trackDeviceId) {
			setVideoDeviceId(trackDeviceId);
		}
	}, []);

	const acquireCamera = useCallback(
		async (deviceId?: string) => {
			if (
				typeof navigator === "undefined" ||
				!navigator.mediaDevices?.getUserMedia
			) {
				throw new Error("Camera is not available in this browser");
			}
			const preferred =
				deviceId || videoDeviceIdRef.current || undefined;
			const stream = await navigator.mediaDevices.getUserMedia({
				video: preferred
					? { deviceId: { exact: preferred } }
					: true,
				audio: false,
			});
			stopStream(videoStreamRef.current);
			videoStreamRef.current = stream;
			setVideoStream(stream);
			const trackDeviceId = stream.getVideoTracks()[0]?.getSettings()
				.deviceId;
			if (trackDeviceId) {
				setVideoDeviceId(trackDeviceId);
			}
			await refreshDevices();
			return stream;
		},
		[refreshDevices],
	);

	const acquireMic = useCallback(
		async (deviceId?: string) => {
			if (
				typeof navigator === "undefined" ||
				!navigator.mediaDevices?.getUserMedia
			) {
				throw new Error("Microphone is not available in this browser");
			}
			const preferred =
				deviceId || audioDeviceIdRef.current || undefined;
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: preferred
					? { deviceId: { exact: preferred } }
					: true,
				video: false,
			});
			// Keep a short-lived probe only to unlock labels; stop after refresh.
			stopStream(audioProbeRef.current);
			audioProbeRef.current = stream;
			const trackDeviceId = stream.getAudioTracks()[0]?.getSettings()
				.deviceId;
			if (trackDeviceId) {
				setAudioDeviceId(trackDeviceId);
			}
			await refreshDevices();
			for (const track of stream.getTracks()) {
				track.stop();
			}
			audioProbeRef.current = null;
		},
		[refreshDevices],
	);

	const toggleMic = useCallback(async () => {
		if (pendingRef.current || !enabled) {
			return;
		}
		if (micEnabled) {
			setMicEnabled(false);
			return;
		}
		pendingRef.current = true;
		setPermissionPending("mic");
		try {
			await acquireMic();
			setMicEnabled(true);
		} catch (error) {
			setMicEnabled(false);
			toast.error(
				error instanceof Error
					? error.message
					: "Microphone permission denied",
			);
		} finally {
			pendingRef.current = false;
			setPermissionPending(null);
		}
	}, [acquireMic, enabled, micEnabled]);

	const toggleCamera = useCallback(async () => {
		if (pendingRef.current || !enabled) {
			return;
		}
		if (cameraEnabled) {
			stopStream(videoStreamRef.current);
			videoStreamRef.current = null;
			setVideoStream(null);
			setCameraEnabled(false);
			return;
		}
		pendingRef.current = true;
		setPermissionPending("camera");
		try {
			await acquireCamera();
			setCameraEnabled(true);
		} catch (error) {
			setCameraEnabled(false);
			toast.error(
				error instanceof Error
					? error.message
					: "Camera permission denied",
			);
		} finally {
			pendingRef.current = false;
			setPermissionPending(null);
		}
	}, [acquireCamera, cameraEnabled, enabled]);

	// Restart camera stream when the selected device changes while camera is on.
	useEffect(() => {
		if (!enabled || !cameraEnabled || !videoDeviceId) {
			return;
		}
		const currentId = videoStreamRef.current
			?.getVideoTracks()[0]
			?.getSettings().deviceId;
		if (currentId === videoDeviceId) {
			return;
		}
		let cancelled = false;
		void (async () => {
			try {
				await acquireCamera(videoDeviceId);
				if (cancelled) {
					stopStream(videoStreamRef.current);
					videoStreamRef.current = null;
					setVideoStream(null);
				}
			} catch (error) {
				if (!cancelled) {
					toast.error(
						error instanceof Error
							? error.message
							: "Could not switch camera",
					);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [acquireCamera, cameraEnabled, enabled, videoDeviceId]);

	useEffect(() => {
		if (!enabled) {
			stopPreview();
			setMicEnabled(false);
			setCameraEnabled(false);
		}
	}, [enabled, stopPreview]);

	useEffect(() => {
		return () => {
			stopStream(videoStreamRef.current);
			videoStreamRef.current = null;
			stopStream(audioProbeRef.current);
			audioProbeRef.current = null;
		};
	}, []);

	return {
		micEnabled,
		cameraEnabled,
		audioDeviceId,
		videoDeviceId,
		audioOutputDeviceId,
		audioDevices,
		videoDevices,
		outputDevices,
		permissionPending,
		videoStream,
		setAudioDeviceId,
		setVideoDeviceId,
		setAudioOutputDeviceId,
		toggleMic,
		toggleCamera,
		stopPreview,
		transferCameraTrack,
		adoptCameraTrack,
		refreshDevices,
	};
}
