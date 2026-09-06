const ANAM_BASE_URL = "https://api.anam.ai/v1";

export type AnamConfig = {
	apiKey: string;
};

export function getAnamConfig(
	env: NodeJS.ProcessEnv = process.env,
): AnamConfig {
	const apiKey = env.ANAM_API_KEY;
	if (!apiKey) {
		throw new Error("ANAM_API_KEY must be set");
	}
	return { apiKey };
}

async function anamRequest<T>(
	path: string,
	opts?: {
		method?: string;
		body?: unknown;
		config?: AnamConfig;
	},
): Promise<T> {
	const config = opts?.config ?? getAnamConfig();
	const response = await fetch(`${ANAM_BASE_URL}${path}`, {
		method: opts?.method ?? (opts?.body ? "POST" : "GET"),
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: opts?.body ? JSON.stringify(opts.body) : undefined,
	});

	const text = await response.text();
	if (!response.ok) {
		throw new Error(`Anam API ${response.status}: ${text}`);
	}

	return text ? (JSON.parse(text) as T) : ({} as T);
}

export type StatefulPersonaConfig = {
	personaId: string;
};

export type EphemeralPersonaConfig = {
	name?: string;
	avatarId: string;
	voiceId?: string;
	llmId?: string;
	systemPrompt?: string;
};

export async function createSessionToken(opts: {
	personaConfig: StatefulPersonaConfig | EphemeralPersonaConfig;
	clientLabel?: string;
	config?: AnamConfig;
}) {
	return anamRequest<{ sessionToken: string }>("/auth/session-token", {
		body: {
			personaConfig: opts.personaConfig,
			clientLabel: opts.clientLabel,
		},
		config: opts.config,
	});
}

export async function listPersonas(opts?: {
	page?: number;
	perPage?: number;
	config?: AnamConfig;
}) {
	const page = opts?.page ?? 1;
	const perPage = opts?.perPage ?? 50;
	return anamRequest<{
		data: Array<{ id: string; name?: string; avatarId?: string }>;
		meta?: Record<string, unknown>;
	}>(`/personas?page=${page}&perPage=${perPage}`, { config: opts?.config });
}

export async function listAvatars(opts?: {
	page?: number;
	perPage?: number;
	config?: AnamConfig;
}) {
	const page = opts?.page ?? 1;
	const perPage = opts?.perPage ?? 50;
	return anamRequest<{
		data: Array<{ id: string; name?: string }>;
		meta?: Record<string, unknown>;
	}>(`/avatars?page=${page}&perPage=${perPage}`, { config: opts?.config });
}

export { anamRequest };
