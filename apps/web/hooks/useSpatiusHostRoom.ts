"use client";

import { Room } from "livekit-client";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Host room for Spatius AvatarKit `attach()`: must use
 * `singlePeerConnection: false`, and connect only after attach completes.
 *
 * Connect is gated by room identity (not a delayed useEffect) so the first
 * render of a new Spatius session never calls `room.connect()` before attach.
 *
 * @see https://docs.spatius.ai/sdk-reference/web-sdk/rtc-adapter#host-owned-rtc-clients
 */
export function useSpatiusHostRoom(enabled: boolean) {
	const room = useMemo(
		() => (enabled ? new Room({ singlePeerConnection: false }) : undefined),
		[enabled],
	);

	/** The room instance AvatarKit has successfully attached to. */
	const [attachedRoom, setAttachedRoom] = useState<Room | null>(null);

	useEffect(() => {
		if (!enabled) {
			setAttachedRoom(null);
		}
	}, [enabled]);

	const markAttached = useCallback(() => {
		if (!room) {
			return;
		}
		setAttachedRoom(room);
	}, [room]);

	/** Drop the connect gate (e.g. Strict Mode remount before re-attach). */
	const resetAttached = useCallback(() => {
		setAttachedRoom(null);
	}, []);

	return {
		room,
		/**
		 * Non-Spatius sessions connect immediately. Spatius waits until
		 * `attachedRoom === room` so attach always wins the race with connect.
		 */
		connect: !enabled || (room != null && attachedRoom === room),
		markAttached,
		resetAttached,
	};
}
