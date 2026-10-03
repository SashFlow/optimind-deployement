import type { Room } from "livekit-client";

export type SpatialRealAvatarConnectionStatus =
	| "idle"
	| "initializing"
	| "connecting"
	| "connected"
	| "disconnecting"
	| "error";

export interface UseSpatialRealAvatarOptions {
	appId: string;
	avatarId: string;
	/** SpatialReal session token from the session-start API. */
	sessionToken: string;
	/** LiveKit URL for the subscribe-only renderer participant. */
	serverUrl: string;
	/** LiveKit token for the subscribe-only renderer participant. */
	rendererToken: string;
	/**
	 * User session room from <LiveKitRoom>. Used only to wait until the
	 * conversation room is connected before starting the avatar session — the
	 * SDK joins with its own renderer identity and never owns this Room.
	 */
	room?: Room | null;
	enabled?: boolean;
	sdkLogLevel?: "off" | "error" | "warning" | "all";
	onAvatarError?: (error: Error) => void;
	onConnected?: (room: Room | null) => void;
	onDisconnected?: () => void;
	onStateChange?: (status: SpatialRealAvatarConnectionStatus) => void;
}

export interface SpatialRealAvatarState {
	downloadProgress: number | null;
	error: Error | null;
	isConnected: boolean;
	isLoading: boolean;
	room: Room | null;
	status: SpatialRealAvatarConnectionStatus;
}

export interface UseSpatialRealAvatarResult extends SpatialRealAvatarState {
	containerRef: (node: HTMLDivElement | null) => void;
	disconnect: () => Promise<void>;
	reconnect: () => Promise<void>;
}
