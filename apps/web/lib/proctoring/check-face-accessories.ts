import { orpcClient } from "@shared/lib/orpc-client";

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

export type FaceAccessoryClientResult = {
	glassesDetected: boolean;
	headphonesDetected: boolean;
	clear: boolean;
	message: string;
	model: string;
};

/** Encode the current video frame as a JPEG blob for Gemini accessory checks. */
export function encodeVideoFrameJpeg(
	video: HTMLVideoElement,
	quality: number,
	canvas?: HTMLCanvasElement,
): Promise<Blob | null> {
	const width = video.videoWidth;
	const height = video.videoHeight;
	if (!width || !height) {
		return Promise.resolve(null);
	}
	const target = canvas ?? document.createElement("canvas");
	target.width = width;
	target.height = height;
	const ctx = target.getContext("2d");
	if (!ctx) {
		return Promise.resolve(null);
	}
	ctx.drawImage(video, 0, 0, width, height);
	return new Promise((resolve) => {
		target.toBlob((blob) => resolve(blob), "image/jpeg", quality);
	});
}

/** Mid-session Gemini check for glasses / headphones (frame is not persisted). */
export async function checkFaceAccessories(args: {
	sessionId: string;
	participantToken: string;
	frame: Blob;
}): Promise<FaceAccessoryClientResult> {
	const contentBase64 = await blobToBase64(args.frame);
	const response = await orpcClient.sessions.faceAccessoryCheck({
		id: args.sessionId,
		contentBase64,
		contentType: args.frame.type || "image/jpeg",
		participantToken: args.participantToken,
	});
	return response.check;
}

/** Demo playground Gemini check (`/demo/captures`) — password gated, no session. */
export async function checkDemoFaceAccessories(args: {
	password: string;
	frame: Blob;
}): Promise<FaceAccessoryClientResult> {
	const contentBase64 = await blobToBase64(args.frame);
	const response = await fetch("/api/demo/face-accessory-check", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			password: args.password,
			contentBase64,
			contentType: args.frame.type || "image/jpeg",
		}),
	});
	if (!response.ok) {
		throw new Error(
			(await response.text()) || "Demo face accessory check failed",
		);
	}
	const data = (await response.json()) as {
		check: FaceAccessoryClientResult;
	};
	return data.check;
}
