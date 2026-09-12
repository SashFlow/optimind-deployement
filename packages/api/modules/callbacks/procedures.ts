import {
	scheduleCallback,
	getAgentSessionById,
} from "@repo/database";
import { ORPCError } from "@orpc/client";
import { z } from "zod";
import { workerProcedure } from "../sessions/lib/worker-procedure";

export const schedule = workerProcedure
	.route({
		method: "POST",
		path: "/internal/callbacks/schedule",
		tags: ["Internal"],
		summary: "Schedule a callback / dialer retry (worker)",
	})
	.input(
		z.object({
			sessionId: z.string(),
			scheduledAt: z.coerce.date(),
			phoneNumber: z.string().min(1),
			campaignId: z.string().optional(),
			contactMetadata: z.record(z.string(), z.unknown()).optional(),
			source: z
				.enum(["RESCHEDULE", "VOICEMAIL", "MANUAL"])
				.optional(),
		}),
	)
	.handler(async ({ input }) => {
		const session = await getAgentSessionById(input.sessionId);
		if (!session) throw new ORPCError("NOT_FOUND");

		const meta =
			session.metadata &&
			typeof session.metadata === "object" &&
			!Array.isArray(session.metadata)
				? (session.metadata as Record<string, unknown>)
				: {};

		const campaignId =
			input.campaignId ??
			session.campaignSession?.campaignId ??
			(typeof meta.campaign_id === "string"
				? meta.campaign_id
				: typeof meta.campaignId === "string"
					? meta.campaignId
					: null);

		const campaignContactId =
			session.campaignSession?.contactId ??
			(typeof meta.campaign_contact_id === "string"
				? meta.campaign_contact_id
				: typeof meta.campaignContactId === "string"
					? meta.campaignContactId
					: null);

		const source =
			input.source ??
			(meta.source === "voicemail" ? "VOICEMAIL" : "RESCHEDULE");

		const callback = await scheduleCallback({
			organizationId: session.organizationId,
			sessionId: session.id,
			campaignId,
			campaignContactId,
			phoneE164: input.phoneNumber,
			scheduledAt: input.scheduledAt,
			source,
			contactMetadata: input.contactMetadata ?? {},
		});

		return {
			ok: true,
			callbackId: callback.id,
			contactId: campaignContactId,
			nextAttemptAt: callback.scheduledAt,
			status: callback.status,
		};
	});
