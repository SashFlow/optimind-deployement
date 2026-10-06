import type { Room } from "livekit-client";

export type SpatiusAvatarConnectionStatus =
	| "idle"
	| "initializing"
	| "connecting"
	| "connected"
	| "disconnecting"
	| "error";

export interface UseSpatiusAvatarOptions {
	appId: string;
	avatarId: string;
	/**
	 * Host-owned LiveKit room from <LiveKitRoom>. Must be created with
	 * `singlePeerConnection: false`. AvatarKit attaches before the room
	 * connects (see Spatius RTC Adapter host-owned flow).
	 */
	room: Room;
	enabled?: boolean;
	/**
	 * Fired once AvatarKit has attached to the host room so the session can
	 * safely call `room.connect` / set LiveKitRoom `connect`.
	 */
	onAttached?: () => void;
	onAvatarError?: (error: Error) => void;
	onConnected?: () => void;
	onDisconnected?: () => void;
	onStateChange?: (status: SpatiusAvatarConnectionStatus) => void;
}

export interface SpatiusAvatarState {
	error: Error | null;
	isConnected: boolean;
	isLoading: boolean;
	status: SpatiusAvatarConnectionStatus;
}

export interface UseSpatiusAvatarResult extends SpatiusAvatarState {
	containerRef: (node: HTMLDivElement | null) => void;
	disconnect: () => Promise<void>;
}
