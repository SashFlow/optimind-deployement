import {
	getAgentSessionByRoomName,
	getEgressJobByLivekitId,
	updateAgentSessionLifecycle,
	updateEgressJob,
} from "@repo/database";
import { createWebhookReceiver, getLiveKitConfig } from "@repo/livekit";
import { logger } from "@repo/logs";
import { maybeEnqueueSessionTrackMerge } from "../lib/enqueue-track-merge";
import { generateEndUserMemoriesSafe } from "../lib/memories";
import {
	egressTimingFields,
	mapLivekitEgressStatus,
} from "../lib/reconcile-egress";

const TERMINAL_EGRESS_STATUSES = new Set(["COMPLETE", "FAILED", "ABORTED"]);

function extractFileUrl(egressInfo: {
	file?: { location?: string };
	fileResults?: Array<{ location?: string }>;
}): string | undefined {
	if (egressInfo.file?.location) {
		return egressInfo.file.location;
	}
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

					const status = mapLivekitEgressStatus(info.status);
					// LiveKit appends the real container extension to track
					// filepaths; persist that onto destination so merge/download
					// don't use the extensionless template key.
					const destinationUpdate = (() => {
						if (!fileUrl) {
							return undefined;
						}
						let filepath: string | undefined;
						if (fileUrl.startsWith("s3://")) {
							const without = fileUrl.slice("s3://".length);
							const slash = without.indexOf("/");
							if (slash !== -1) {
								filepath = without.slice(slash + 1);
							}
						} else {
							try {
								filepath = new URL(fileUrl).pathname.replace(
									/^\//,
									"",
								);
							} catch {
								filepath = undefined;
							}
						}
						if (!filepath) {
							return undefined;
						}
						const prev =
							job.destination &&
							typeof job.destination === "object" &&
							!Array.isArray(job.destination)
								? (job.destination as Record<string, unknown>)
								: {};
						return { ...prev, filepath };
					})();

					await updateEgressJob(job.id, {
						status,
						fileUrl: fileUrl ?? undefined,
						outputUrls,
						...(destinationUpdate
							? {
									destination:
										destinationUpdate as unknown as {
											[key: string]:
												| string
												| number
												| boolean
												| null;
										},
								}
							: {}),
						errorMessage: info.error || undefined,
						...egressTimingFields(info),
					});

					if (
						(job.type === "TRACK" || job.type === "PARTICIPANT") &&
						job.agentSessionId &&
						TERMINAL_EGRESS_STATUSES.has(status)
					) {
						await maybeEnqueueSessionTrackMerge(job.agentSessionId);
					}
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
			if (session) {
				await generateEndUserMemoriesSafe(session.id);
				try {
					const { resumeAgentSessionWait } = await import(
						"../../workflows/lib/runner"
					);
					await resumeAgentSessionWait(session.id);
				} catch (err) {
					logger.error(
						"Failed to resume workflow after room_finished",
						{
							err,
						},
					);
				}
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
