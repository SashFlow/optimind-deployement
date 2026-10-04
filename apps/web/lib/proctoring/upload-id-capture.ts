import { orpcClient } from "@shared/lib/orpc-client";
import type { IdCaptureResult } from "@/lib/proctoring/idCard";

async function blobToBase64(blob: Blob): Promise<string> {
	const buffer = await blob.arrayBuffer();
	let binary = "";
	const bytes = new Uint8Array(buffer);
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return btoa(binary);
}

/** Upload ID crop + full-frame evidence as SessionFiles for the live participant. */
export async function uploadIdCaptureFiles(args: {
	sessionId: string;
	participantToken: string;
	result: IdCaptureResult;
}) {
	const [cardBase64, frameBase64] = await Promise.all([
		blobToBase64(args.result.card),
		blobToBase64(args.result.frame),
	]);

	const card = await orpcClient.sessions.uploadParticipantFile({
		id: args.sessionId,
		contentBase64: cardBase64,
		contentType: args.result.card.type || "image/jpeg",
		name: "id-card.jpg",
		participantToken: args.participantToken,
	});
	const frame = await orpcClient.sessions.uploadParticipantFile({
		id: args.sessionId,
		contentBase64: frameBase64,
		contentType: args.result.frame.type || "image/jpeg",
		name: "id-card-full.jpg",
		participantToken: args.participantToken,
	});
	return { card: card.file, frame: frame.file };
}
