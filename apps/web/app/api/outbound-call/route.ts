import { createAgentSession, getAgentById } from "@repo/database";
import { createOutboundRoomWithDispatch } from "@repo/livekit";
import { NextResponse } from "next/server";
import { normalizePhoneNumber } from "@/lib/phone";

const AGENT_NAME = process.env.AGENT_NAME || "demo-agent";

export const revalidate = 0;

type OutboundCallBody = {
	phoneNumber?: string;
	slug?: string;
	language?: string;
	selectedAgent?: string;
	staggeredMode?: boolean;
	selectedPersona: string;
	organizationId?: string;
	agentId?: string;
	recordingEnabled?: boolean;
};

function configRecordingEnabled(config: unknown): boolean {
	if (!config || typeof config !== "object") return false;
	return Boolean((config as { recordingEnabled?: boolean }).recordingEnabled);
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as OutboundCallBody;
		const phoneNumber = normalizePhoneNumber(body.phoneNumber ?? "");
		const slug = (body.slug ?? "").trim();
		const language = (body.language ?? "English").trim() || "English";
		const selectedAgent =
			(body.selectedAgent ?? "Sanjay").trim() || "Sanjay";
		const staggeredMode = body.staggeredMode ?? false;
		const persona = body.selectedPersona;
		if (!phoneNumber) {
			return NextResponse.json(
				{ error: "Invalid phone number" },
				{ status: 400 },
			);
		}
		if (!slug && !(body.organizationId && body.agentId)) {
			return NextResponse.json(
				{ error: "Missing scenario slug or agentId" },
				{ status: 400 },
			);
		}

		const roomName = `PHONE_SESSION_${Math.floor(Math.random() * 100_000)}`;
		let sessionId: string | undefined;
		let metadata: string;

		if (body.organizationId && body.agentId) {
			const agent = await getAgentById(body.agentId);
			if (!agent || agent.organizationId !== body.organizationId) {
				return NextResponse.json(
					{ error: "Agent not found" },
					{ status: 404 },
				);
			}
			const version = agent.publishedVersion ?? agent.draftVersion;
			if (!version) {
				return NextResponse.json(
					{ error: "Agent has no version" },
					{ status: 400 },
				);
			}
			const configSnapshot =
				(version.config as Record<string, unknown>) ?? {};
			const recordingEnabled =
				body.recordingEnabled ?? configRecordingEnabled(configSnapshot);

			const session = await createAgentSession({
				organizationId: body.organizationId,
				agentId: agent.id,
				agentVersionId: version.id,
				livekitRoomName: roomName,
				channel: "PHONE",
				direction: "OUTBOUND",
				toNumber: phoneNumber,
				configSnapshot,
				recordingEnabled,
				metadata: {
					source: "phone",
					scenarioSlug: slug,
				},
			});
			sessionId = session.id;

			metadata = JSON.stringify({
				organization_id: body.organizationId,
				agent_id: agent.id,
				agent_version_id: version.id,
				session_id: session.id,
				config: configSnapshot,
				source: "phone",
				phone_number: phoneNumber,
				direction: "OUTBOUND",
				channel: "PHONE",
				recording_enabled: recordingEnabled,
				interactionMode: "audio",
				scenarioSlug: slug,
				scenarioType: "phone",
				language,
				selectedAgent,
				staggeredMode,
				persona,
			});
		} else {
			metadata = JSON.stringify({
				interactionMode: "audio",
				scenarioSlug: slug,
				scenarioType: "phone",
				language,
				selectedAgent,
				phone_number: phoneNumber,
				staggeredMode,
				persona,
			});
		}

		await createOutboundRoomWithDispatch({
			roomName,
			agentName: AGENT_NAME,
			metadata,
		});

		return NextResponse.json(
			{ roomName, status: "dispatched", sessionId },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		console.error(error);
		const message =
			error instanceof Error
				? error.message
				: "Failed to dispatch outbound call";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
