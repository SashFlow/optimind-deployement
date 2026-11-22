"use client";

import { useRoomContext } from "@livekit/components-react";
import {
	ConnectionState,
	LocalVideoTrack,
	RoomEvent,
	Track,
} from "livekit-client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Publishes a camera MediaStreamTrack that was already open in the prejoin
 * lobby, so LiveKit does not tear down and reacquire the device on join.
 *
 * Guarantees at most one Camera publication: if something else already
 * published the camera (or a racing setCameraEnabled finished first), we
 * reuse that publication instead of adding a second track that room-composite
 * egress would tile side-by-side.
 */
export function PublishPrefetchedCamera({
	track,
	videoDeviceId,
}: {
	track: MediaStreamTrack;
	videoDeviceId?: string;
}) {
	const room = useRoomContext();
	const trackRef = useRef(track);
	trackRef.current = track;
	const publishedRef = useRef(false);

	useEffect(() => {
		let cancelled = false;

		async function ensureCamera() {
			if (cancelled || publishedRef.current) {
				return;
			}
			publishedRef.current = true;

			const mediaTrack = trackRef.current;
			const deviceOpts = videoDeviceId
				? { deviceId: videoDeviceId }
				: undefined;

			const existing = room.localParticipant.getTrackPublication(
				Track.Source.Camera,
			);
			if (existing?.track) {
				// Another path already published the camera — drop the unused
				// prejoin track so we don't hold a second device open locally.
				const publishedMedia = existing.track.mediaStreamTrack;
				if (
					mediaTrack.readyState === "live" &&
					mediaTrack !== publishedMedia
				) {
					mediaTrack.stop();
				}
				if (existing.isMuted) {
					try {
						await room.localParticipant.setCameraEnabled(true);
					} catch {
						// Publication exists; unmute failure is non-fatal here.
					}
				}
				return;
			}

			try {
				if (mediaTrack.readyState === "live") {
					const deviceId =
						mediaTrack.getSettings().deviceId || videoDeviceId;
					const localTrack = new LocalVideoTrack(
						mediaTrack,
						deviceId ? { deviceId } : mediaTrack.getConstraints(),
						// SDK-managed so mute/unmute restarts the camera like a
						// normal LiveKit camera track.
						false,
					);
					localTrack.source = Track.Source.Camera;

					// Re-check after async gap — another publisher may have won.
					const raced = room.localParticipant.getTrackPublication(
						Track.Source.Camera,
					);
					if (raced?.track) {
						localTrack.stop();
						if (raced.isMuted) {
							await room.localParticipant.setCameraEnabled(true);
						}
						return;
					}

					await room.localParticipant.publishTrack(localTrack);
					return;
				}

				await room.localParticipant.setCameraEnabled(true, deviceOpts);
			} catch (error) {
				publishedRef.current = false;
				try {
					await room.localParticipant.setCameraEnabled(
						true,
						deviceOpts,
					);
					publishedRef.current = true;
				} catch {
					toast.error(
						error instanceof Error
							? error.message
							: "Camera could not be published",
					);
				}
			}
		}

		if (room.state === ConnectionState.Connected) {
			void ensureCamera();
		}

		const handleConnected = () => {
			void ensureCamera();
		};
		room.on(RoomEvent.Connected, handleConnected);
		return () => {
			cancelled = true;
			room.off(RoomEvent.Connected, handleConnected);
		};
	}, [room, videoDeviceId]);

	return null;
}
