import {
	HeadObjectCommand,
	ListObjectsV2Command,
	S3Client,
} from "@aws-sdk/client-s3";
import { createEgressJob } from "@repo/database";
import { getEgressS3Config } from "@repo/livekit";
import { logger } from "@repo/logs";

const TRACK_ROLES = ["user_audio", "user_video", "agent_audio"] as const;
type TrackRole = (typeof TRACK_ROLES)[number];

type EgressJobLike = {
	id: string;
	metadata?: unknown;
	destination?: unknown;
	fileUrl?: string | null;
	outputUrls?: string[] | null;
	livekitEgressId?: string | null;
};

type SessionLike = {
	id: string;
	organizationId: string;
	agentId?: string | null;
	livekitRoomName: string;
	channel?: string | null;
	recordingEnabled?: boolean | null;
	campaignSession?: { id: string } | null;
	egressJobs: EgressJobLike[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

function roleFromJob(job: EgressJobLike): TrackRole | null {
	const meta = asRecord(job.metadata);
	const role = typeof meta?.role === "string" ? meta.role : null;
	if (role && TRACK_ROLES.includes(role as TrackRole)) {
		return role as TrackRole;
	}

	const dest = asRecord(job.destination);
	const filepath =
		(typeof dest?.filepath === "string" ? dest.filepath : null) ||
		job.fileUrl ||
		job.outputUrls?.[0] ||
		"";
	const base = filepath.split("/").pop()?.split("?")[0] ?? "";
	const stem = base.replace(/\.[^.]+$/, "");
	if (TRACK_ROLES.includes(stem as TrackRole)) {
		return stem as TrackRole;
	}
	return null;
}

function parseTrackObjectKey(
	key: string,
	session: SessionLike,
): { role: TrackRole; key: string } | null {
	const prefix = `${session.organizationId}/${session.id}/`;
	if (!key.startsWith(prefix)) {
		return null;
	}
	const rest = key.slice(prefix.length);
	// `{room}/{role}.{ext}` or `{room}/{role}`
	const parts = rest.split("/");
	if (parts.length < 2) {
		return null;
	}
	const filename = parts[parts.length - 1] ?? "";
	const stem = filename.replace(/\.[^.]+$/, "");
	if (!TRACK_ROLES.includes(stem as TrackRole)) {
		return null;
	}
	return { role: stem as TrackRole, key };
}

function createRecordingsS3Client() {
	const cfg = getEgressS3Config();
	if (!cfg) {
		return null;
	}
	return {
		cfg,
		client: new S3Client({
			region: cfg.region,
			endpoint: cfg.endpoint,
			forcePathStyle: Boolean(cfg.endpoint),
			credentials: {
				accessKeyId: cfg.accessKey,
				secretAccessKey: cfg.secret,
			},
		}),
	};
}

/**
 * When egress files landed in the recordings bucket but no EgressJob rows exist
 * (e.g. worker local-egress fallback), create COMPLETE TRACK jobs so the
 * dashboard can show them.
 */
export async function backfillTrackEgressJobsFromStorage(
	session: SessionLike,
): Promise<number> {
	const existingRoles = new Set(
		session.egressJobs
			.map(roleFromJob)
			.filter((role): role is TrackRole => Boolean(role)),
	);
	if (existingRoles.size >= TRACK_ROLES.length) {
		return 0;
	}

	const recordings = createRecordingsS3Client();
	if (!recordings) {
		return 0;
	}

	const { client, cfg } = recordings;
	const prefix = `${session.organizationId}/${session.id}/`;
	const found = new Map<TrackRole, { key: string; sizeBytes?: number }>();

	try {
		let continuationToken: string | undefined;
		do {
			const listed = await client.send(
				new ListObjectsV2Command({
					Bucket: cfg.bucket,
					Prefix: prefix,
					ContinuationToken: continuationToken,
					MaxKeys: 100,
				}),
			);
			for (const item of listed.Contents ?? []) {
				if (!item.Key) {
					continue;
				}
				const parsed = parseTrackObjectKey(item.Key, session);
				if (!parsed || existingRoles.has(parsed.role)) {
					continue;
				}
				const prev = found.get(parsed.role);
				// Prefer keys with an extension when duplicates appear.
				if (
					!prev ||
					(!prev.key.includes(".") && parsed.key.includes("."))
				) {
					found.set(parsed.role, {
						key: parsed.key,
						sizeBytes:
							typeof item.Size === "number"
								? item.Size
								: undefined,
					});
				}
			}
			continuationToken = listed.IsTruncated
				? listed.NextContinuationToken
				: undefined;
		} while (continuationToken);
	} catch (error) {
		logger.warn("Failed to list recordings for egress backfill", {
			sessionId: session.id,
			prefix,
			error,
		});
		return 0;
	}

	if (found.size === 0) {
		return 0;
	}

	const audioOnly =
		session.channel === "SIP" || session.channel === "PHONE";
	let created = 0;

	for (const [role, object] of found) {
		const fileUrl = `s3://${cfg.bucket}/${object.key}`;
		try {
			// Confirm object still exists before writing a job row.
			await client.send(
				new HeadObjectCommand({
					Bucket: cfg.bucket,
					Key: object.key,
				}),
			);
			await createEgressJob({
				organizationId: session.organizationId,
				type: "TRACK",
				agentSessionId: session.id,
				agentId: session.agentId ?? undefined,
				campaignSessionId: session.campaignSession?.id,
				roomName: session.livekitRoomName,
				livekitEgressId: `storage:${object.key}`,
				status: "COMPLETE",
				startedAt: new Date(),
				endedAt: new Date(),
				sizeBytes: object.sizeBytes,
				destination: {
					bucket: cfg.bucket,
					region: cfg.region,
					filepath: object.key,
					endpoint: cfg.endpoint ?? null,
				},
				fileUrl,
				outputUrls: [fileUrl],
				metadata: {
					audioOnly,
					role,
					kind: "track",
					source: "storage_backfill",
				},
			});
			created += 1;
		} catch (error) {
			logger.warn("Failed to backfill egress job from storage", {
				sessionId: session.id,
				role,
				key: object.key,
				error,
			});
		}
	}

	if (created > 0) {
		logger.info("Backfilled egress jobs from recordings bucket", {
			sessionId: session.id,
			created,
			roles: [...found.keys()],
		});
	}

	return created;
}
