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

		async function publish() {
			if (cancelled || publishedRef.current) {
				return;
			}
			publishedRef.current = true;

			const mediaTrack = trackRef.current;
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
					await room.localParticipant.publishTrack(localTrack);
					return;
				}

				await room.localParticipant.setCameraEnabled(
					true,
					videoDeviceId ? { deviceId: videoDeviceId } : undefined,
				);
			} catch (error) {
				publishedRef.current = false;
				toast.error(
					error instanceof Error
						? error.message
						: "Camera could not be published",
				);
			}
		}

		if (room.state === ConnectionState.Connected) {
			void publish();
		}

		const handleConnected = () => {
			void publish();
		};
		room.on(RoomEvent.Connected, handleConnected);
		return () => {
			cancelled = true;
			room.off(RoomEvent.Connected, handleConnected);
		};
	}, [room, videoDeviceId]);

	return null;
}
