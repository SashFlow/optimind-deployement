export type LiveKitConfig = {
	url: string;
	apiKey: string;
	apiSecret: string;
};

export function getLiveKitConfig(
	env: NodeJS.ProcessEnv = process.env,
): LiveKitConfig {
	const url = env.LIVEKIT_URL;
	const apiKey = env.LIVEKIT_API_KEY;
	const apiSecret = env.LIVEKIT_API_SECRET;

	if (!url || !apiKey || !apiSecret) {
		throw new Error(
			"LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be set",
		);
	}

	return { url, apiKey, apiSecret };
}

export function livekitHttpHost(url: string): string {
	return url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}
