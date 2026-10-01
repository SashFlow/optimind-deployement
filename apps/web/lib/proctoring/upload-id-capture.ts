import { orpcClient } from "@shared/lib/orpc-client";
import type { IdCaptureResult } from "@/lib/proctoring/idCard";

function blobToFile(blob: Blob, name: string) {
	return new File([blob], name, {
		type: blob.type || "image/jpeg",
	});
}

/** Upload ID crop + full-frame evidence as SessionFiles for the live participant. */
export async function uploadIdCaptureFiles(args: {
	sessionId: string;
	participantToken: string;
	result: IdCaptureResult;
}) {
	const card = await orpcClient.sessions.uploadParticipantFile({
		id: args.sessionId,
		file: blobToFile(args.result.card, "id-card.jpg"),
		name: "id-card.jpg",
		participantToken: args.participantToken,
	});
	const frame = await orpcClient.sessions.uploadParticipantFile({
		id: args.sessionId,
		file: blobToFile(args.result.frame, "id-card-full.jpg"),
		name: "id-card-full.jpg",
		participantToken: args.participantToken,
	});
	return { card: card.file, frame: frame.file };
}
