import { orpcClient } from "@shared/lib/orpc-client";
import type { FaceCaptureResult } from "@/lib/proctoring/faceCapture";

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

/** Upload face crop + full-frame evidence as SessionFiles for the live participant. */
export async function uploadFaceCaptureFiles(args: {
	sessionId: string;
	participantToken: string;
	result: FaceCaptureResult;
}) {
	const [faceBase64, frameBase64] = await Promise.all([
		blobToBase64(args.result.face),
		blobToBase64(args.result.frame),
	]);

	const face = await orpcClient.sessions.uploadParticipantFile({
		id: args.sessionId,
		contentBase64: faceBase64,
		contentType: args.result.face.type || "image/jpeg",
		name: "face.jpg",
		participantToken: args.participantToken,
	});
	const frame = await orpcClient.sessions.uploadParticipantFile({
		id: args.sessionId,
		contentBase64: frameBase64,
		contentType: args.result.frame.type || "image/jpeg",
		name: "face-full.jpg",
		participantToken: args.participantToken,
	});
	return { face: face.file, frame: frame.file };
}
