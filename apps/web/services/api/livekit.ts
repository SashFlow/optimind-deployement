import { orpcClient } from "@shared/lib/orpc-client";

type FetchSessionCredentialsInput = {
	api?: unknown;
	organizationId: string;
	agentId: string;
	agentVersionId?: string;
	contactMetadata?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	participantName?: string;
};

export async function fetchSessionCredentials({
	organizationId,
	agentId,
	agentVersionId,
	contactMetadata,
	metadata,
	participantName,
}: FetchSessionCredentialsInput): Promise<{
	sessionId: string;
	participantToken: string;
	serverUrl: string;
	spatialRealAppId: string | null;
	spatialRealSessionToken: string | null;
	spatialRealRendererToken: string | null;
}> {
	const result = await orpcClient.sessions.create({
		organizationId,
		agentId,
		agentVersionId,
		channel: "WEB",
		direction: "WEB",
		source: "web",
		participantName: participantName ?? "user",
		contactMetadata: {
			...(contactMetadata ?? {}),
			...(metadata ?? {}),
		},
		mintParticipantToken: true,
	});

	if (!result.participantToken || !result.serverUrl) {
		throw new Error("Failed to mint LiveKit session credentials");
	}

	return {
		sessionId: result.session.id,
		participantToken: result.participantToken,
		serverUrl: result.serverUrl,
		spatialRealAppId: result.spatialRealAppId ?? null,
		spatialRealSessionToken: result.spatialRealSessionToken ?? null,
		spatialRealRendererToken: result.spatialRealRendererToken ?? null,
	};
}
