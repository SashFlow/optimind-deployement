import { RoomConfiguration } from "@livekit/protocol";
import { createParticipantToken, getLiveKitConfig } from "@repo/livekit";
import { NextResponse } from "next/server";

type ConnectionDetails = {
	serverUrl: string;
	roomName: string;
	participantName: string;
	participantToken: string;
};

export const revalidate = 0;

function resolveInteractionMode(scenarioType: string): "audio" | "video" {
	return scenarioType === "avatar" || scenarioType === "video"
		? "video"
		: "audio";
}

export async function POST(req: Request) {
	try {
		const cfg = getLiveKitConfig();

		const body = await req.json();
		const roomConfig = body?.room_config
			? RoomConfiguration.fromJson(body.room_config, {
					ignoreUnknownFields: true,
				})
			: new RoomConfiguration();

		const { searchParams } = new URL(req.url);
		const scenarioType = searchParams.get("scenarioType") ?? "audio";
		const slug = searchParams.get("slug") ?? "";
		const language = searchParams.get("language");
		const selectedAgent = searchParams.get("selectedAgent");
		const persona = searchParams.get("selectedPersona");
		const selectedStaggeredMode = searchParams.get("selectedStaggeredMode");
		if (slug) {
			const interactionMode = resolveInteractionMode(scenarioType);
			const agentMetadata = JSON.stringify({
				interactionMode,
				scenarioSlug: slug,
				scenarioType,
				language,
				selectedAgent,
				persona,
				staggeredMode: selectedStaggeredMode,
			});

			roomConfig.metadata = `${interactionMode}-${slug}`;
			roomConfig.agents = (roomConfig.agents ?? []).map((agent) => {
				agent.metadata = agentMetadata;
				return agent;
			});
		}

		const participantName = "user";
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
		const roomName = `SESSION_${timestamp}_${Math.floor(Math.random() * 10_000)}`;

		const participantToken = await createParticipantToken({
			identity: participantIdentity,
			name: participantName,
			roomName,
			roomConfig,
		});

		const data: ConnectionDetails = {
			serverUrl: cfg.url,
			roomName,
			participantName,
			participantToken,
		};
		return NextResponse.json(data, {
			headers: { "Cache-Control": "no-store" },
		});
	} catch (error) {
		if (error instanceof Error) {
			console.error(error);
			return new NextResponse(error.message, { status: 500 });
		}
	}
}
