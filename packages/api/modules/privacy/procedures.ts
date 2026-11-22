import { ORPCError } from "@orpc/client";
import {
	eraseEndUserData,
	exportEndUserData,
	exportPlatformUserData,
	getEndUserById,
	listExpiredTranscripts,
	purgeExpiredTranscriptRecord,
} from "@repo/database";
import { logger } from "@repo/logs";
import { deleteObject } from "@repo/storage";
import { z } from "zod";
import { adminProcedure, protectedProcedure } from "../../orpc/procedures";
import { recordAudit } from "../shared/audit";
import { requireOrgAdmin } from "../shared/require-org-role";

function parseStorageRef(raw: string): { bucket?: string; key: string } | null {
	const value = raw.trim();
	if (!value) {
		return null;
	}
	if (value.startsWith("s3://")) {
		const without = value.slice("s3://".length);
		const slash = without.indexOf("/");
		if (slash <= 0) {
			return null;
		}
		return {
			bucket: without.slice(0, slash),
			key: without.slice(slash + 1),
		};
	}
	if (value.startsWith("gs://")) {
		const without = value.slice("gs://".length);
		const slash = without.indexOf("/");
		if (slash <= 0) {
			return null;
		}
		return {
			bucket: without.slice(0, slash),
			key: without.slice(slash + 1),
		};
	}
	// Bare object key — caller must supply bucket via env defaults.
	return { key: value };
}

async function tryDeleteStorageKeys(keys: string[]) {
	const recordings =
		process.env.GCP_BUCKET_RECORDINGS ||
		process.env.S3_BUCKET_RECORDINGS ||
		"";
	const transcripts =
		process.env.GCP_BUCKET_TRANSCRIPTS ||
		process.env.S3_BUCKET_TRANSCRIPTS ||
		"";
	const knowledge =
		process.env.GCP_STORAGE_BUCKET_NAME || process.env.S3_BUCKET_NAME || "";

	for (const raw of keys) {
		const parsed = parseStorageRef(raw);
		if (!parsed) {
			continue;
		}
		const bucket =
			parsed.bucket ||
			(raw.includes("transcript")
				? transcripts
				: raw.includes("knowledge")
					? knowledge
					: recordings) ||
			recordings ||
			knowledge;
		if (!bucket) {
			continue;
		}
		try {
			await deleteObject(parsed.key, { bucket });
		} catch (error) {
			logger.warn(
				"Failed to delete storage object during DSAR/retention",
				{
					key: parsed.key,
					bucket,
					error,
				},
			);
		}
	}
}

/** GDPR/DPDP: export the authenticated platform user's account data. */
export const exportMyData = protectedProcedure
	.route({
		method: "GET",
		path: "/privacy/me/export",
		tags: ["Privacy"],
		summary: "Export authenticated platform user data (DSAR)",
	})
	.handler(async ({ context }) => {
		const data = await exportPlatformUserData(context.user.id);
		return { exportedAt: new Date().toISOString(), data };
	});

/** Org admin: export an end user's personal data package. */
export const exportEndUser = protectedProcedure
	.route({
		method: "GET",
		path: "/privacy/end-users/{id}/export",
		tags: ["Privacy"],
		summary: "Export end-user data for DSAR (org admin)",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const endUser = await getEndUserById(input.id);
		if (!endUser) {
			throw new ORPCError("NOT_FOUND");
		}
		await requireOrgAdmin(endUser.organizationId, context.user.id);
		const data = await exportEndUserData(input.id);
		await recordAudit({
			headers: context.headers,
			userId: context.user.id,
			organizationId: endUser.organizationId,
			actionType: "UPDATE",
			resourceType: "end_user",
			resourceId: input.id,
			after: { dsar: "export" },
		});
		return { exportedAt: new Date().toISOString(), data };
	});

/** Org admin: erase end user + attempt storage cleanup. */
export const eraseEndUser = protectedProcedure
	.route({
		method: "DELETE",
		path: "/privacy/end-users/{id}",
		tags: ["Privacy"],
		summary: "Erase end-user personal data (DSAR)",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const endUser = await getEndUserById(input.id);
		if (!endUser) {
			throw new ORPCError("NOT_FOUND");
		}
		await requireOrgAdmin(endUser.organizationId, context.user.id);
		const result = await eraseEndUserData(input.id);
		if (result?.storageKeys?.length) {
			await tryDeleteStorageKeys(result.storageKeys.map((k) => k.key));
		}
		await recordAudit({
			headers: context.headers,
			userId: context.user.id,
			organizationId: endUser.organizationId,
			actionType: "DELETE",
			resourceType: "end_user",
			resourceId: input.id,
			after: { dsar: "erase" },
		});
		return { erased: true as const };
	});

/**
 * Platform admin / cron: purge expired transcripts and related media.
 * Call on a schedule (e.g. daily) with WORKER_API_KEY or as admin.
 */
export const runRetentionPurge = adminProcedure
	.route({
		method: "POST",
		path: "/privacy/retention/purge",
		tags: ["Privacy"],
		summary: "Purge expired transcripts and related media",
	})
	.input(
		z
			.object({
				limit: z.number().int().min(1).max(500).optional(),
			})
			.optional(),
	)
	.handler(async ({ input, context }) => {
		const expired = await listExpiredTranscripts(input?.limit ?? 100);
		let purged = 0;
		for (const row of expired) {
			const result = await purgeExpiredTranscriptRecord(row.id);
			if (result?.storageKeys?.length) {
				await tryDeleteStorageKeys(result.storageKeys);
			}
			purged += 1;
			await recordAudit({
				headers: context.headers,
				userId: context.user.id,
				organizationId: row.organizationId,
				actionType: "DELETE",
				resourceType: "transcript",
				resourceId: row.id,
				after: { retention: "expired_purge" },
			});
		}
		return { purged, scanned: expired.length };
	});
