export type PlivoConfig = {
	authId: string;
	authToken: string;
};

export function getPlivoConfig(
	env: NodeJS.ProcessEnv = process.env,
): PlivoConfig {
	const authId = env.PLIVO_AUTH_ID;
	const authToken = env.PLIVO_AUTH_TOKEN;
	if (!authId || !authToken) {
		throw new Error("PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN must be set");
	}
	return { authId, authToken };
}

function authHeader(config: PlivoConfig): string {
	return `Basic ${Buffer.from(`${config.authId}:${config.authToken}`).toString("base64")}`;
}

export async function plivoRequest<T>(
	path: string,
	opts?: {
		method?: string;
		body?: unknown;
		config?: PlivoConfig;
	},
): Promise<T> {
	const config = opts?.config ?? getPlivoConfig();
	const url = `https://api.plivo.com/v1/Account/${config.authId}${path}`;
	const response = await fetch(url, {
		method: opts?.method ?? (opts?.body ? "POST" : "GET"),
		headers: {
			Authorization: authHeader(config),
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: opts?.body ? JSON.stringify(opts.body) : undefined,
	});

	const text = await response.text();
	if (!response.ok) {
		throw new Error(`Plivo API ${response.status}: ${text}`);
	}

	return text ? (JSON.parse(text) as T) : ({} as T);
}
