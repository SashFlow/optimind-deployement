"use client";

import { cn } from "@repo/ui/utils";
import type { AvatarView } from "@spatialwalk/avatarkit";
import type {
	AvatarPlayer,
	RTCConnectionConfig,
} from "@spatialwalk/avatarkit-rtc";
import { ConnectionState, type Room, RoomEvent } from "livekit-client";
import { useEffect, useRef, useState } from "react";

type LiveKitProviderInternals = {
	room: Room | null;
	audioElements: Map<string, HTMLMediaElement>;
};

/**
 * The SpatialReal LiveKit provider normally creates and connects its own Room.
 * In preview the Room is owned by <LiveKitRoom>, so we hand the provider that
 * Room instead (it only creates one when `room` is unset) and keep it from
 * disconnecting it. Agent audio is already played by <RoomAudioRenderer>, so
 * the provider's own audio elements are muted to avoid double playback.
 */
async function createSharedRoomProvider(room: Room) {
	const { LiveKitProvider } = await import("@spatialwalk/avatarkit-rtc");

	class SharedRoomLiveKitProvider extends LiveKitProvider {
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

		override async connect(config: RTCConnectionConfig) {
			await super.connect(config);
			this.muteProviderAudio();
			room.on(RoomEvent.TrackSubscribed, this.muteProviderAudio);
			room.once(RoomEvent.Disconnected, () => {
				room.off(RoomEvent.TrackSubscribed, this.muteProviderAudio);
			});
		}

		override async disconnect() {
			this.internals.room = null;
			await super.disconnect();
		}
	}

	return new SharedRoomLiveKitProvider();
}

function waitForRoomConnected(room: Room, signal: AbortSignal) {
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

export default function SpatialRealAvatarStage({
	room,
	avatarId,
	className,
}: {
	room: Room;
	avatarId?: string | null;
	className?: string;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const abort = new AbortController();
		let view: AvatarView | null = null;
		let player: AvatarPlayer | null = null;

		async function start(container: HTMLDivElement) {
			const appId = process.env.NEXT_PUBLIC_SPATIALREAL_APP_ID;
			const resolvedAvatarId =
				avatarId || process.env.NEXT_PUBLIC_SPATIALREAL_AVATAR_ID;
			if (!appId || !resolvedAvatarId) {
				throw new Error(
					"Missing NEXT_PUBLIC_SPATIALREAL_APP_ID or SpatialReal avatar id",
				);
			}

			const [avatarkit, { AvatarPlayer }] = await Promise.all([
				import("@spatialwalk/avatarkit"),
				import("@spatialwalk/avatarkit-rtc"),
			]);
			const {
				AvatarManager,
				AvatarSDK,
				AvatarView,
				DrivingServiceMode,
				Environment,
			} = avatarkit;

			if (!AvatarSDK.isInitialized) {
				await AvatarSDK.initialize(appId, {
					environment: Environment.intl,
					drivingServiceMode: DrivingServiceMode.host,
				});
			}

			const avatar = await AvatarManager.shared.load(resolvedAvatarId);
			if (abort.signal.aborted) {
				return;
			}
			view = new AvatarView(avatar, container);

			const provider = await createSharedRoomProvider(room);
			await waitForRoomConnected(room, abort.signal);
			if (abort.signal.aborted) {
				return;
			}

			const activePlayer = new AvatarPlayer(
				provider as unknown as ConstructorParameters<
					typeof AvatarPlayer
				>[0],
				view,
				{ logLevel: "warning" },
			);
			player = activePlayer;
			activePlayer.on("error", (eventError) => {
				setError(
					eventError instanceof Error
						? eventError.message
						: "Avatar stream error",
				);
			});

			// The Room is already connected, so the provider's room.connect()
			// call is a no-op and these credentials are never used.
			await activePlayer.connect({
				url: "shared-room",
				token: "shared-room",
				roomName: room.name,
			});
			if (!abort.signal.aborted) {
				setIsLoading(false);
			}
		}

		setIsLoading(true);
		setError(null);
		start(container).catch((initError: unknown) => {
			if (abort.signal.aborted) {
				return;
			}
			setError(
				initError instanceof Error
					? initError.message
					: "Failed to initialize avatar",
			);
			setIsLoading(false);
		});

		return () => {
			abort.abort();
			const activePlayer = player;
			const activeView = view;
			void (async () => {
				try {
					await activePlayer?.disconnect();
				} catch {
					// Ignore cleanup errors during teardown.
				}
				try {
					activeView?.dispose();
				} catch (disposeError) {
					console.warn(
						"Failed to dispose avatar view:",
						disposeError,
					);
				}
			})();
		};
	}, [avatarId, room]);

	return (
		<div className={cn("relative size-full", className)}>
			<div ref={containerRef} className="size-full" />

			{isLoading && !error ? (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
					<div className="size-7 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
					<p className="text-xs text-white/70">Loading avatar…</p>
				</div>
			) : null}

			{error ? (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/80 px-4 text-center">
					<p className="text-sm text-red-400">Avatar error</p>
					<p className="text-xs text-white/60">{error}</p>
				</div>
			) : null}
		</div>
	);
}
