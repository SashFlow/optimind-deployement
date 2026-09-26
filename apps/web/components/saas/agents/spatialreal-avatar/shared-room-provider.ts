"use client";

import type {
	AvatarPlayer,
	RTCConnectionConfig,
} from "@spatialwalk/avatarkit-rtc";
import { ConnectionState, type Room, RoomEvent } from "livekit-client";

/** `RTCProvider` is not exported from the package root; borrow it from AvatarPlayer. */
type RtcProvider = ConstructorParameters<typeof AvatarPlayer>[0];

/** `RTCRtpReceiver.transform` is not in the DOM lib on every TS version. */
type TransformableReceiver = { transform: unknown };

/**
 * Members the SDK marks `@internal`, so they are absent from its typings but
 * present at runtime. Pinned here so the overrides below stay readable.
 */
type LiveKitProviderInternals = {
	room: Room | null;
	audioElements: Map<string, HTMLMediaElement>;
	animationCallbacks: unknown;
	transformedReceivers: Set<TransformableReceiver>;
	setupEventListeners: (livekit: unknown) => void;
	subscribeAnimationTrack: (callbacks: unknown) => Promise<void>;
};

/**
 * Placeholder credentials. The shared room is already connected by the time the
 * player connects, so `Room.connect()` returns early and never reads these.
 */
export const SHARED_ROOM_CREDENTIAL = "shared-room";

/**
 * The SpatialReal LiveKit provider normally creates and connects its own Room.
 * Here the Room is owned by <LiveKitRoom>, so we hand the provider that Room
 * instead (it only creates one when `room` is unset) and keep it from
 * disconnecting it. Agent audio is already played by <RoomAudioRenderer>, so
 * the provider's own audio elements are muted to avoid double playback.
 *
 * Everything the SDK ties to the peer connection's lifetime — the animation
 * receiver transform, the room event listeners — has to be managed by hand
 * here, because the peer connection outlives the player.
 */
export async function createSharedRoomProvider(
	room: Room,
): Promise<RtcProvider> {
	const { LiveKitProvider } = await import("@spatialwalk/avatarkit-rtc");

	const baseSetupEventListeners = (
		LiveKitProvider.prototype as unknown as LiveKitProviderInternals
	).setupEventListeners;

	class SharedRoomLiveKitProvider extends LiveKitProvider {
		private listenersAttached = false;

		constructor() {
			super();
			this.internals.room = room;
		}

		private get internals() {
			return this as unknown as LiveKitProviderInternals;
		}

		private muteProviderAudio = () => {
			for (const element of this.internals.audioElements.values()) {
				element.muted = true;
			}
		};

		/**
		 * The base class calls this from every `connect()`, assuming a room it
		 * created and will throw away. Ours is long-lived, so a second connect
		 * would stack a duplicate copy of every listener onto it.
		 */
		setupEventListeners(livekit: unknown) {
			if (this.listenersAttached) {
				return;
			}
			this.listenersAttached = true;
			baseSetupEventListeners.call(this, livekit);
		}

		override async connect(config: RTCConnectionConfig) {
			// disconnect() nulls the room to protect the caller's; put it back so
			// a reconnect reuses it instead of building a fresh Room and dialling
			// the placeholder credentials above.
			this.internals.room = room;
			await super.connect(config);

			// The base only installs the animation transform from TrackSubscribed
			// and from the scan inside subscribeAnimationTrack(), which
			// AvatarPlayer runs *before* connect(). On an already-connected room
			// neither fires, so rescan now or the player never sees a frame.
			const { animationCallbacks } = this.internals;
			if (animationCallbacks) {
				await this.internals.subscribeAnimationTrack(
					animationCallbacks,
				);
			}

			this.detachAudioMuting();
			this.muteProviderAudio();
			room.on(RoomEvent.TrackSubscribed, this.muteProviderAudio);
			room.once(RoomEvent.Disconnected, this.detachAudioMuting);
		}

		private detachAudioMuting = () => {
			room.off(RoomEvent.TrackSubscribed, this.muteProviderAudio);
			room.off(RoomEvent.Disconnected, this.detachAudioMuting);
		};

		/**
		 * The base `cleanup()` drops its extractor bookkeeping but leaves
		 * `receiver.transform` installed, and its
		 * `applyAnimationReceiverTransform()` skips any receiver that already has
		 * one. On a room the SDK owns that is harmless — disconnecting it
		 * destroys the peer connection. Here the receivers outlive the player, so
		 * leaving the transform behind means the next player attaches to a
		 * receiver whose transform still feeds the disposed extractor, and the
		 * avatar never animates again while agent audio keeps playing.
		 */
		private releaseAnimationTransforms() {
			for (const receiver of this.internals.transformedReceivers) {
				try {
					receiver.transform = null;
				} catch {
					// No setter on this engine; nothing else we can release.
				}
			}
		}

		override async disconnect() {
			this.detachAudioMuting();
			// Runs before the first await so an overlapping reconnect cannot have
			// installed its transform yet.
			this.releaseAnimationTransforms();
			// Null the room next: the base disconnect() would otherwise tear down
			// the caller's room.
			this.internals.room = null;
			await super.disconnect();
		}
	}

	return new SharedRoomLiveKitProvider() as unknown as RtcProvider;
}

export function waitForRoomConnected(room: Room, signal: AbortSignal) {
	return new Promise<void>((resolve) => {
		if (room.state === ConnectionState.Connected || signal.aborted) {
			resolve();
			return;
		}
		const done = () => {
			room.off(RoomEvent.Connected, done);
			signal.removeEventListener("abort", done);
			resolve();
		};
		room.on(RoomEvent.Connected, done);
		signal.addEventListener("abort", done);
	});
}
