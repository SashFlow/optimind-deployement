export type SpatiusReplayManifest = {
	avatarId: string;
	clip: string;
	sampleRate: number;
	fps: number;
	frameCount: number;
	durationSeconds: number;
	audio: string;
	frames: string[];
	sourceRun?: string;
};

export function spatiusReplayBasePath(avatarId: string, clip: string): string {
	return `/spatius-replay/${avatarId}/${clip}`;
}

/** Strip RIFF/WAVE header and return raw PCM16 mono bytes. */
export function decodeWavToPcm16(buffer: ArrayBuffer): {
	pcm: Uint8Array;
	sampleRate: number;
	channels: number;
} {
	const view = new DataView(buffer);
	if (view.byteLength < 44) {
		throw new Error("WAV too short");
	}
	const riff = String.fromCharCode(
		view.getUint8(0),
		view.getUint8(1),
		view.getUint8(2),
		view.getUint8(3),
	);
	const wave = String.fromCharCode(
		view.getUint8(8),
		view.getUint8(9),
		view.getUint8(10),
		view.getUint8(11),
	);
	if (riff !== "RIFF" || wave !== "WAVE") {
		throw new Error("Not a RIFF/WAVE file");
	}

	let offset = 12;
	let sampleRate = 0;
	let channels = 0;
	let bitsPerSample = 0;
	let dataOffset = -1;
	let dataSize = 0;

	while (offset + 8 <= view.byteLength) {
		const chunkId = String.fromCharCode(
			view.getUint8(offset),
			view.getUint8(offset + 1),
			view.getUint8(offset + 2),
			view.getUint8(offset + 3),
		);
		const chunkSize = view.getUint32(offset + 4, true);
		const chunkData = offset + 8;
		if (chunkId === "fmt ") {
			channels = view.getUint16(chunkData + 0, true);
			sampleRate = view.getUint32(chunkData + 4, true);
			bitsPerSample = view.getUint16(chunkData + 14, true);
		} else if (chunkId === "data") {
			dataOffset = chunkData;
			dataSize = chunkSize;
			break;
		}
		offset = chunkData + chunkSize + (chunkSize % 2);
	}

	if (dataOffset < 0) {
		throw new Error("WAV missing data chunk");
	}
	if (bitsPerSample !== 16) {
		throw new Error(`Expected 16-bit PCM WAV, got ${bitsPerSample}-bit`);
	}
	if (channels !== 1) {
		throw new Error(`Expected mono WAV, got ${channels} channels`);
	}

	return {
		pcm: new Uint8Array(buffer, dataOffset, dataSize),
		sampleRate,
		channels,
	};
}

export async function loadSpatiusReplayBundle(
	avatarId: string,
	clip: string,
): Promise<{
	manifest: SpatiusReplayManifest;
	pcm: Uint8Array;
	sampleRate: number;
	frames: ArrayBuffer[];
}> {
	const base = spatiusReplayBasePath(avatarId, clip);
	const manifestRes = await fetch(`${base}/manifest.json`);
	if (!manifestRes.ok) {
		throw new Error(
			`Replay assets not found at ${base}/manifest.json (${manifestRes.status})`,
		);
	}
	const manifest = (await manifestRes.json()) as SpatiusReplayManifest;

	const audioRes = await fetch(`${base}/${manifest.audio}`);
	if (!audioRes.ok) {
		throw new Error(`Failed to load audio (${audioRes.status})`);
	}
	const { pcm, sampleRate } = decodeWavToPcm16(await audioRes.arrayBuffer());

	const frames = await Promise.all(
		manifest.frames.map(async (rel) => {
			const res = await fetch(`${base}/${rel}`);
			if (!res.ok) {
				throw new Error(`Failed to load frame ${rel} (${res.status})`);
			}
			return res.arrayBuffer();
		}),
	);

	return { manifest, pcm, sampleRate, frames };
}
