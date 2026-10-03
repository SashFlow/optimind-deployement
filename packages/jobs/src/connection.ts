import type { ConnectionOptions } from "bullmq";

export function getRedisUrl(env: NodeJS.ProcessEnv = process.env): string {
	const url = env.REDIS_URL?.trim();
	if (!url) {
		throw new Error("Missing env variable REDIS_URL");
	}
	return url;
}

/** Shared BullMQ connection options derived from REDIS_URL. */
export function getBullMqConnection(
	env: NodeJS.ProcessEnv = process.env,
): ConnectionOptions {
	const raw = getRedisUrl(env);
	const url = new URL(raw);
	const dbPath = url.pathname?.replace(/^\//, "");
	const db =
		dbPath && /^\d+$/.test(dbPath)
			? Number.parseInt(dbPath, 10)
			: undefined;

	return {
		host: url.hostname,
		port: Number(url.port || 6379),
		username: url.username ? decodeURIComponent(url.username) : undefined,
		password: url.password ? decodeURIComponent(url.password) : undefined,
		db,
		tls: url.protocol === "rediss:" ? {} : undefined,
		maxRetriesPerRequest: null,
	};
}
