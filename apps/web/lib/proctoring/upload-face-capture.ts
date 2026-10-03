import { orpcClient } from "@shared/lib/orpc-client";
import type { FaceCaptureResult } from "@/lib/proctoring/faceCapture";

function blobToFile(blob: Blob, name: string) {
	return new File([blob], name, {
		type: blob.type || "image/jpeg",
	});
}

/** Upload face crop + full-frame evidence as SessionFiles for the live participant. */
export async function uploadFaceCaptureFiles(args: {
	sessionId: string;
	participantToken: string;
	result: FaceCaptureResult;
}) {
	const face = await orpcClient.sessions.uploadParticipantFile({
		id: args.sessionId,
		file: blobToFile(args.result.face, "face.jpg"),
		name: "face.jpg",
		participantToken: args.participantToken,
	});
	const frame = await orpcClient.sessions.uploadParticipantFile({
		id: args.sessionId,
		file: blobToFile(args.result.frame, "face-full.jpg"),
		name: "face-full.jpg",
		participantToken: args.participantToken,
	});
	return { face: face.file, frame: frame.file };
}
