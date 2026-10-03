export type PublicAgentPreview = {
	id: string;
	name: string;
	avatarEnabled: boolean;
	avatarProvider: string | null;
	avatarId: string | null;
	hasPublishedVersion: boolean;
	variables: Array<{
		name: string;
		variable_type: "link" | "text" | "number" | "file";
		required: boolean;
	}>;
	sessionModalities: {
		call_type: "web" | "phone" | "both";
		audio_track: "mandatory" | "optional";
		video_track: "mandatory" | "optional";
		chat: "mandatory" | "optional";
		memory: boolean;
		proctoring: {
			enabled: boolean;
			proactive_response: boolean;
			id_verification: boolean;
		};
	};
	maxDurationSeconds: number | null;
};

export type GetTrialLinkOutput = {
	trial: {
		id: string;
		label: string;
		token: string;
		enabled: boolean;
		usageLimit: number;
		usageCount: number;
		remaining: number;
		expiresAt: Date | string | null;
		available: boolean;
		unavailableReason:
			| "disabled"
			| "expired"
			| "exhausted"
			| "unpublished"
			| null;
	};
	agent: PublicAgentPreview;
};

export type GetEmbedAgentOutput = {
	embed: {
		token: string;
		available: boolean;
		unavailableReason: "unpublished" | null;
	};
	agent: PublicAgentPreview;
};

export type StartPublicSessionOutput = {
	sessionId: string;
	roomName: string;
	channel: "WEB" | "PHONE";
	serverUrl: string | null;
	participantToken: string | null;
	phoneNumber: string | null;
	spatialRealAppId: string | null;
	spatialRealSessionToken: string | null;
	spatialRealRendererToken: string | null;
};

export type StartEmbedSessionInput = {
	token: string;
	participantName?: string;
	contactMetadata?: Record<string, unknown>;
	externalId?: string;
	name?: string;
};

export type StartTrialSessionInput = {
	token: string;
	participantName?: string;
	contactMetadata?: Record<string, unknown>;
	phoneNumber?: string;
	name?: string;
	email?: string;
	contactPhone?: string;
};

/** SpatialReal app id + session token for prejoin asset warmup (no LiveKit room). */
export type SpatialRealWarmupCredentials = {
	spatialRealAppId: string | null;
	spatialRealSessionToken: string | null;
};
