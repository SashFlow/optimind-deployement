import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import {
	createAgentSession,
	getAgentById,
} from "@repo/database";
import {
	createParticipantToken,
	createRoom,
	getLiveKitConfig,
} from "@repo/livekit";
import { NextResponse } from "next/server";

type ConnectionDetails = {
	serverUrl: string;
	roomName: string;
	participantName: string;
	participantToken: string;
	sessionId?: string;
};

export const revalidate = 0;

const AGENT_NAME = process.env.AGENT_NAME || "demo-agent";

function resolveInteractionMode(scenarioType: string): "audio" | "video" {
	return scenarioType === "avatar" || scenarioType === "video"
		? "video"
		: "audio";
}

function configRecordingEnabled(config: unknown): boolean {
	if (!config || typeof config !== "object") return false;
	return Boolean((config as { recordingEnabled?: boolean }).recordingEnabled);
}

export async function POST(req: Request) {
	try {
		const cfg = getLiveKitConfig();

		const body = await req.json().catch(() => ({}));
		const organizationId =
			typeof body?.organizationId === "string"
				? body.organizationId
				: undefined;
		const agentId =
			typeof body?.agentId === "string" ? body.agentId : undefined;
		const recordingOverride =
			typeof body?.recordingEnabled === "boolean"
				? body.recordingEnabled
				: undefined;

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

		const participantName = "user";
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
		const roomName = `SESSION_${timestamp}_${Math.floor(Math.random() * 10_000)}`;

		let sessionId: string | undefined;
		let agentMetadata: string | undefined;

		if (organizationId && agentId) {
			const agent = await getAgentById(agentId);
			if (!agent || agent.organizationId !== organizationId) {
				return new NextResponse("Agent not found", { status: 404 });
			}
			const version = agent.publishedVersion ?? agent.draftVersion;
			if (!version) {
				return new NextResponse("Agent has no version", { status: 400 });
			}
			const configSnapshot =
				(version.config as Record<string, unknown>) ?? {};
			const recordingEnabled =
				recordingOverride ?? configRecordingEnabled(configSnapshot);

			const session = await createAgentSession({
				organizationId,
				agentId: agent.id,
				agentVersionId: version.id,
				livekitRoomName: roomName,
				channel: "WEB",
				direction: "WEB",
				configSnapshot,
				recordingEnabled,
				metadata: {
					source: "web",
					scenarioType,
					scenarioSlug: slug,
				},
			});
			sessionId = session.id;

			agentMetadata = JSON.stringify({
				organization_id: organizationId,
				agent_id: agent.id,
				agent_version_id: version.id,
				session_id: session.id,
				config: configSnapshot,
				source: "web",
				direction: "WEB",
				channel: "WEB",
				recording_enabled: recordingEnabled,
				interactionMode: resolveInteractionMode(scenarioType),
				scenarioSlug: slug,
				scenarioType,
				language,
				selectedAgent,
				persona,
				staggeredMode: selectedStaggeredMode,
			});

			await createRoom({ name: roomName, metadata: agentMetadata });
			roomConfig.metadata = agentMetadata;
			roomConfig.agents = [
				new RoomAgentDispatch({
					agentName: AGENT_NAME,
					metadata: agentMetadata,
				}),
			];
		} else if (slug) {
			const interactionMode = resolveInteractionMode(scenarioType);
			agentMetadata = JSON.stringify({
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
				agent.metadata = agentMetadata!;
				return agent;
			});
		}

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
			sessionId,
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
