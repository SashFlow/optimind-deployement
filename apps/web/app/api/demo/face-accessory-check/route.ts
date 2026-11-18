import { checkFaceAccessories } from "@repo/api/modules/sessions/lib/face-accessory-check";
import { NextResponse } from "next/server";
import { unauthorizedDemoCapture } from "@/lib/demo/capture-auth";

export const revalidate = 0;

const MAX_BYTES = 5 * 1024 * 1024;

function decodeBase64Payload(value: string): Buffer {
	const trimmed = value.trim();
	const comma = trimmed.indexOf(",");
	const raw =
		trimmed.startsWith("data:") && comma !== -1
			? trimmed.slice(comma + 1)
			: trimmed;
	return Buffer.from(raw, "base64");
}

/**
 * Password-gated Gemini glasses/headphones check for `/demo/captures`.
 * Body: `{ password, contentBase64, contentType? }` — frame is not persisted.
 */
export async function POST(request: Request) {
	let body: {
		password?: unknown;
		contentBase64?: unknown;
		contentType?: unknown;
	};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return new NextResponse("Invalid JSON body", { status: 400 });
	}

	const authError = unauthorizedDemoCapture(
		typeof body.password === "string" ? body.password : undefined,
	);
	if (authError) {
		return authError;
	}

	const contentBase64 =
		typeof body.contentBase64 === "string" ? body.contentBase64 : "";
	if (!contentBase64.trim()) {
		return new NextResponse("Image payload required", { status: 400 });
	}

	let bytes: Buffer;
	try {
		bytes = decodeBase64Payload(contentBase64);
	} catch {
		return new NextResponse("Invalid image payload", { status: 400 });
	}
	if (bytes.byteLength === 0) {
		return new NextResponse("Empty image payload", { status: 400 });
	}
	if (bytes.byteLength > MAX_BYTES) {
		return new NextResponse(`Image exceeds ${MAX_BYTES} bytes`, {
			status: 400,
		});
	}

	const mimeType =
		typeof body.contentType === "string" && body.contentType.trim()
			? body.contentType.trim()
			: "image/jpeg";
	if (!mimeType.toLowerCase().startsWith("image/")) {
		return new NextResponse("contentType must be an image/* MIME type", {
			status: 400,
		});
	}

	try {
		const check = await checkFaceAccessories({
			bytes,
			mimeType,
		});
		return NextResponse.json(
			{ check },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Face accessory check failed";
		if (message.includes("not configured")) {
			return new NextResponse("Face accessory check is not configured", {
				status: 503,
			});
		}
		console.error("demo face accessory check failed", error);
		return new NextResponse(message.slice(0, 500), { status: 500 });
	}
}
