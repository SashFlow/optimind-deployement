import {
	createParticipantToken,
	createRoom,
	getLiveKitConfig,
} from "@repo/livekit";
import { NextResponse } from "next/server";
import { unauthorizedDemoCapture } from "@/lib/demo/capture-auth";

export const revalidate = 0;

/**
 * Password-gated token for the capture playground (`/demo/captures`).
 * Creates a LiveKit room with no agent dispatch so ID / face / body capture
 * can be exercised from the client without agent activation.
 *
 * Body: `{ "password": "<DEMO_CAPTURE_PASSWORD>" }`
 */
export async function POST(request: Request) {
	let password = "";
	try {
		const body = (await request.json()) as { password?: unknown };
		password =
			typeof body.password === "string" ? body.password.trim() : "";
	} catch {
		return new NextResponse("Password required", { status: 400 });
	}

	const authError = unauthorizedDemoCapture(password);
	if (authError) {
		return authError;
	}

	try {
		const cfg = getLiveKitConfig();
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const roomName = `CAPTURE_DEMO_${timestamp}_${Math.floor(Math.random() * 10_000)}`;
		const identity = `capture_demo_${Math.floor(Math.random() * 10_000)}`;

		await createRoom({
			name: roomName,
			metadata: JSON.stringify({ source: "capture-demo" }),
			emptyTimeout: 60 * 15,
			maxParticipants: 2,
		});

		const participantToken = await createParticipantToken({
			identity,
			name: "capture-demo",
			roomName,
			ttl: "1h",
		});

		return NextResponse.json(
			{
				serverUrl: cfg.url,
				roomName,
				participantToken,
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		console.error("capture demo token failed", error);
		return new NextResponse(
			error instanceof Error ? error.message : "Failed to create token",
			{ status: 500 },
		);
	}
}
