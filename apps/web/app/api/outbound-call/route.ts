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
};

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
		if (!slug) {
			return NextResponse.json(
				{ error: "Missing scenario slug" },
				{ status: 400 },
			);
		}

		const roomName = `PHONE_SESSION_${Math.floor(Math.random() * 100_000)}`;
		const metadata = JSON.stringify({
			interactionMode: "audio",
			scenarioSlug: slug,
			scenarioType: "phone",
			language,
			selectedAgent,
			phone_number: phoneNumber,
			staggeredMode: staggeredMode,
			persona: persona,
		});

		await createOutboundRoomWithDispatch({
			roomName,
			agentName: AGENT_NAME,
			metadata,
		});

		return NextResponse.json(
			{ roomName, status: "dispatched" },
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
