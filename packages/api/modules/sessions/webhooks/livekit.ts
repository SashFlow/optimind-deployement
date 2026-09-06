import {
	getAgentSessionByRoomName,
	getEgressJobByLivekitId,
	updateAgentSessionLifecycle,
	updateEgressJob,
} from "@repo/database";
import { createWebhookReceiver, getLiveKitConfig } from "@repo/livekit";
import { EgressStatus } from "@livekit/protocol";
import { logger } from "@repo/logs";

type EgressJobStatus =
	| "STARTING"
	| "ACTIVE"
	| "ENDING"
	| "COMPLETE"
	| "FAILED"
	| "ABORTED";

function mapEgressStatus(
	status: EgressStatus | number | undefined,
): EgressJobStatus {
	switch (status) {
		case EgressStatus.EGRESS_STARTING:
			return "STARTING";
		case EgressStatus.EGRESS_ACTIVE:
			return "ACTIVE";
		case EgressStatus.EGRESS_ENDING:
			return "ENDING";
		case EgressStatus.EGRESS_COMPLETE:
			return "COMPLETE";
		case EgressStatus.EGRESS_FAILED:
		case EgressStatus.EGRESS_LIMIT_REACHED:
			return "FAILED";
		case EgressStatus.EGRESS_ABORTED:
			return "ABORTED";
		default:
			return "ACTIVE";
	}
}

function extractFileUrl(egressInfo: {
	file?: { location?: string };
	fileResults?: Array<{ location?: string }>;
}): string | undefined {
	if (egressInfo.file?.location) return egressInfo.file.location;
	const first = egressInfo.fileResults?.find((f) => f.location);
	return first?.location;
}

export async function livekitWebhookHandler(
	request: Request,
): Promise<Response> {
	try {
		getLiveKitConfig();
	} catch {
		return new Response("LiveKit not configured", { status: 500 });
	}

	const authHeader = request.headers.get("Authorization") ?? undefined;
	const body = await request.text();

	try {
		const receiver = createWebhookReceiver();
		const event = await receiver.receive(body, authHeader);
		const eventName = event.event;

		if (
			(eventName === "egress_ended" || eventName === "egress_updated") &&
			event.egressInfo
		) {
			const info = event.egressInfo;
			const livekitEgressId = info.egressId;
			if (livekitEgressId) {
				const job = await getEgressJobByLivekitId(livekitEgressId);
				if (job) {
					const fileUrl =
						extractFileUrl(info as never) ?? job.fileUrl;
					const outputUrls = fileUrl
						? Array.from(
								new Set([...(job.outputUrls ?? []), fileUrl]),
							)
						: job.outputUrls;

					await updateEgressJob(job.id, {
						status: mapEgressStatus(info.status),
						fileUrl: fileUrl ?? undefined,
						outputUrls,
						errorMessage: info.error || undefined,
						durationMs:
							info.endedAt && info.startedAt
								? Number(info.endedAt - info.startedAt) /
									1_000_000
								: undefined,
					});
				}
			}
		}

		if (eventName === "room_finished" && event.room?.name) {
			const session = await getAgentSessionByRoomName(event.room.name);
			if (
				session &&
				session.status !== "COMPLETED" &&
				session.status !== "FAILED" &&
				session.status !== "CANCELLED"
			) {
				await updateAgentSessionLifecycle(session.id, {
					status: "COMPLETED",
					livekitRoomSid: event.room.sid || undefined,
					endReason: "ROOM_FINISHED",
				});
			}
		}

		if (
			eventName === "room_started" &&
			event.room?.name &&
			event.room.sid
		) {
			const session = await getAgentSessionByRoomName(event.room.name);
			if (session && !session.livekitRoomSid) {
				await updateAgentSessionLifecycle(session.id, {
					status:
						session.status === "QUEUED" ? "QUEUED" : session.status,
					livekitRoomSid: event.room.sid,
				});
			}
		}

		return new Response("ok", { status: 200 });
	} catch (error) {
		logger.error("LiveKit webhook error", error);
		return new Response("Invalid webhook", { status: 401 });
	}
}
