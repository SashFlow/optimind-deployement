import { RoomConfiguration } from "@livekit/protocol";
import { ORPCError } from "@orpc/server";
import {
	AccessToken,
	type AccessTokenOptions,
	type VideoGrant,
} from "livekit-server-sdk";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

function resolveInteractionMode(scenarioType: string): "audio" | "video" {
	return scenarioType === "avatar" || scenarioType === "video"
		? "video"
		: "audio";
}

function createParticipantToken(
	userInfo: AccessTokenOptions,
	roomName: string,
	roomConfig: RoomConfiguration | undefined,
): Promise<string> {
	const at = new AccessToken(API_KEY, API_SECRET, {
		...userInfo,
		ttl: "15m",
	});
	const grant: VideoGrant = {
		room: roomName,
		roomJoin: true,
		canPublish: true,
		canPublishData: true,
		canSubscribe: true,
	};
	at.addGrant(grant);

	if (roomConfig) {
		at.roomConfig = roomConfig;
	}

	return at.toJwt();
}

export const generateToken = publicProcedure
	.route({
		method: "POST",
		path: "/token",
		tags: ["Token"],
		summary: "Generate a LiveKit participant token",
	})
	.input(
		z.object({
			scenarioType: z.string().optional().default("audio"),
			slug: z.string().optional().default(""),
			language: z.string().nullable().optional(),
			selectedAgent: z.string().nullable().optional(),
			room_config: z.any(),
		}),
	)
	.handler(async ({ input }) => {
		if (LIVEKIT_URL === undefined) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "LIVEKIT_URL is not defined",
			});
		}
		if (API_KEY === undefined) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "LIVEKIT_API_KEY is not defined",
			});
		}
		if (API_SECRET === undefined) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "LIVEKIT_API_SECRET is not defined",
			});
		}

		const { scenarioType, slug, language, selectedAgent, room_config } =
			input;

		const roomConfig = room_config
			? RoomConfiguration.fromJson(room_config, {
					ignoreUnknownFields: true,
				})
			: new RoomConfiguration();

		if (slug) {
			const interactionMode = resolveInteractionMode(scenarioType);
			const agentMetadata = JSON.stringify({
				interactionMode,
				scenarioSlug: slug,
				scenarioType,
				language,
				selectedAgent,
			});

			roomConfig.metadata = `${interactionMode}-${slug}`;
			roomConfig.agents = (roomConfig.agents ?? []).map((agent) => {
				agent.metadata = agentMetadata;
				return agent;
			});
		}

		// Generate participant token
		const participantName = "user";
		const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
		const roomName = `MER_SESSION_${Math.floor(Math.random() * 10_000)}`;

		const participantToken = await createParticipantToken(
			{ identity: participantIdentity, name: participantName },
			roomName,
			roomConfig,
		);

		return {
			serverUrl: LIVEKIT_URL,
			roomName,
			participantName,
			participantToken,
		};
	});
