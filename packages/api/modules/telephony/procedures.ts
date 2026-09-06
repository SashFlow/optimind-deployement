import { ORPCError } from "@orpc/client";
import {
	createCustomVoice,
	createDispatchRule,
	createEgressJob,
	createSipTrunk,
	getDispatchRuleById,
	getEgressJobById,
	getPhoneNumberById,
	getSipTrunkById,
	listCustomVoices,
	listDispatchRules,
	listEgressJobs,
	listPhoneNumbers,
	listSipTrunks,
	updateDispatchRule,
	updateEgressJob,
	updateSipTrunk,
	upsertPhoneNumber,
} from "@repo/database";
import {
	createInboundSipTrunk,
	createOutboundRoomWithDispatch,
	createOutboundSipTrunk,
	createParticipantToken,
	createSipDispatchRule,
	createSipParticipant,
	deleteSipDispatchRule,
	deleteSipTrunk,
	getLiveKitConfig,
	startRoomCompositeEgress,
	stopEgress,
} from "@repo/livekit";
import {
	assignNumberToTrunk,
	createInboundTrunk,
	createOriginationUri,
	createOutboundCredential,
	createOutboundTrunk,
	listPhoneNumbers as listPlivoNumbers,
} from "@repo/plivo";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";

export const listNumbers = protectedProcedure
	.route({
		method: "GET",
		path: "/telephony/numbers",
		tags: ["Telephony"],
		summary: "List phone numbers",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		return { phoneNumbers: await listPhoneNumbers(input.organizationId) };
	});

export const syncPlivoNumbers = protectedProcedure
	.route({
		method: "POST",
		path: "/telephony/numbers/sync",
		tags: ["Telephony"],
		summary: "Sync Plivo numbers",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const remote = await listPlivoNumbers();
		const synced = [];
		for (const n of remote.objects ?? []) {
			const e164 = n.number.startsWith("+") ? n.number : `+${n.number}`;
			synced.push(
				await upsertPhoneNumber({
					organizationId: input.organizationId,
					e164,
					plivoNumberId: n.number_id,
					friendlyName: n.alias,
					capabilities: {
						voice: n.voice_enabled ?? true,
						sms: n.sms_enabled ?? false,
					},
				}),
			);
		}
		return { phoneNumbers: synced };
	});

export const assignNumber = protectedProcedure
	.route({
		method: "PATCH",
		path: "/telephony/numbers/{id}",
		tags: ["Telephony"],
		summary: "Assign phone number",
	})
	.input(
		z.object({
			id: z.string(),
			campaignId: z.string().nullable().optional(),
			agentId: z.string().nullable().optional(),
			sipTrunkId: z.string().nullable().optional(),
			friendlyName: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const existing = await getPhoneNumberById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);
		const phoneNumber = await upsertPhoneNumber({
			organizationId: existing.organizationId,
			e164: existing.e164,
			plivoNumberId: existing.plivoNumberId ?? undefined,
			campaignId: input.campaignId,
			agentId: input.agentId,
			sipTrunkId: input.sipTrunkId,
			friendlyName:
				input.friendlyName ?? existing.friendlyName ?? undefined,
		});
		return { phoneNumber };
	});

export const provisionInboundSip = protectedProcedure
	.route({
		method: "POST",
		path: "/telephony/sip/inbound",
		tags: ["Telephony"],
		summary: "Provision inbound SIP",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string(),
			numbers: z.array(z.string()).min(1),
			livekitSipHost: z
				.string()
				.describe("LiveKit SIP host, e.g. xxx.sip.livekit.cloud"),
			secure: z.boolean().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		const transport = input.secure ? "tls" : "tcp";
		const uri = await createOriginationUri({
			name: `${input.name} LiveKit URI`,
			uri: `${input.livekitSipHost};transport=${transport}`,
		});
		const plivoTrunk = await createInboundTrunk({
			name: input.name,
			primaryUriUuid: uri.uri_uuid,
			secure: input.secure,
		});

		for (const number of input.numbers) {
			const bare = number.replace(/^\+/, "");
			await assignNumberToTrunk(bare, plivoTrunk.trunk_id);
		}

		const livekitTrunk = await createInboundSipTrunk({
			name: input.name,
			numbers: input.numbers,
		});

		const sipTrunk = await createSipTrunk({
			organizationId: input.organizationId,
			name: input.name,
			direction: "INBOUND",
			livekitTrunkId: livekitTrunk.sipTrunkId,
			plivoTrunkId: plivoTrunk.trunk_id,
			plivoUriId: uri.uri_uuid,
			numbers: input.numbers,
		});

		return { sipTrunk, livekitTrunk, plivoTrunk };
	});

export const provisionOutboundSip = protectedProcedure
	.route({
		method: "POST",
		path: "/telephony/sip/outbound",
		tags: ["Telephony"],
		summary: "Provision outbound SIP",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string(),
			numbers: z.array(z.string()).min(1),
			authUsername: z.string().min(5).max(20),
			authPassword: z.string().min(5).max(20),
			plivoOutboundAddress: z
				.string()
				.default("sip:XXXXXXXXXXXX.zt.plivo.com"),
			secure: z.boolean().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		const credential = await createOutboundCredential({
			name: `${input.name} creds`,
			username: input.authUsername,
			password: input.authPassword,
		});
		const plivoTrunk = await createOutboundTrunk({
			name: input.name,
			credentialUuid: credential.credential_uuid,
			secure: input.secure,
		});

		const address =
			plivoTrunk.trunk_domain ??
			input.plivoOutboundAddress.replace(/^sip:/, "");

		const livekitTrunk = await createOutboundSipTrunk({
			name: input.name,
			address,
			numbers: input.numbers,
			authUsername: input.authUsername,
			authPassword: input.authPassword,
		});

		const sipTrunk = await createSipTrunk({
			organizationId: input.organizationId,
			name: input.name,
			direction: "OUTBOUND",
			livekitTrunkId: livekitTrunk.sipTrunkId,
			plivoTrunkId: plivoTrunk.trunk_id,
			plivoCredentialId: credential.credential_uuid,
			authUsername: input.authUsername,
			hasCredentials: true,
			numbers: input.numbers,
		});

		return { sipTrunk, livekitTrunk, plivoTrunk };
	});

export const listTrunks = protectedProcedure
	.route({
		method: "GET",
		path: "/telephony/sip/trunks",
		tags: ["Telephony"],
		summary: "List SIP trunks",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		return { sipTrunks: await listSipTrunks(input.organizationId) };
	});

export const createDispatch = protectedProcedure
	.route({
		method: "POST",
		path: "/telephony/dispatch-rules",
		tags: ["Telephony"],
		summary: "Create dispatch rule",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string(),
			sipTrunkId: z.string().optional(),
			agentId: z.string().optional(),
			campaignId: z.string().optional(),
			roomPrefix: z.string().optional(),
			agentName: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		let trunkIds: string[] | undefined;
		if (input.sipTrunkId) {
			const trunk = await getSipTrunkById(input.sipTrunkId);
			if (trunk?.livekitTrunkId) trunkIds = [trunk.livekitTrunkId];
		}

		const remote = await createSipDispatchRule({
			name: input.name,
			trunkIds,
			roomPrefix: input.roomPrefix,
			agentName: input.agentName,
		});

		const rule = await createDispatchRule({
			organizationId: input.organizationId,
			name: input.name,
			sipTrunkId: input.sipTrunkId,
			agentId: input.agentId,
			campaignId: input.campaignId,
			livekitDispatchRuleId: remote.sipDispatchRuleId,
			roomPrefix: input.roomPrefix,
			ruleConfig: { agentName: input.agentName },
		});

		return { rule, remote };
	});

export const listRules = protectedProcedure
	.route({
		method: "GET",
		path: "/telephony/dispatch-rules",
		tags: ["Telephony"],
		summary: "List dispatch rules",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		return { dispatchRules: await listDispatchRules(input.organizationId) };
	});

export const deleteRule = protectedProcedure
	.route({
		method: "DELETE",
		path: "/telephony/dispatch-rules/{id}",
		tags: ["Telephony"],
		summary: "Delete dispatch rule",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const rule = await getDispatchRuleById(input.id);
		if (!rule) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(rule.organizationId, context.user.id);
		if (rule.livekitDispatchRuleId) {
			await deleteSipDispatchRule(rule.livekitDispatchRuleId);
		}
		await updateDispatchRule(input.id, {
			livekitDispatchRuleId: null,
			metadata: { deleted: true },
		});
		return { success: true };
	});

export const createVoice = protectedProcedure
	.route({
		method: "POST",
		path: "/telephony/custom-voices",
		tags: ["Telephony"],
		summary: "Register custom voice",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string(),
			livekitVoiceId: z.string().optional(),
			sampleStorageKeys: z.array(z.string()).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const voice = await createCustomVoice(input);
		return { voice };
	});

export const listVoices = protectedProcedure
	.route({
		method: "GET",
		path: "/telephony/custom-voices",
		tags: ["Telephony"],
		summary: "List custom voices",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		return { voices: await listCustomVoices(input.organizationId) };
	});

export const mintToken = protectedProcedure
	.route({
		method: "POST",
		path: "/telephony/rooms/token",
		tags: ["Telephony"],
		summary: "Mint room token",
	})
	.input(
		z.object({
			organizationId: z.string(),
			roomName: z.string(),
			identity: z.string(),
			name: z.string().optional(),
			metadata: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const cfg = getLiveKitConfig();
		const token = await createParticipantToken({
			identity: input.identity,
			name: input.name,
			roomName: input.roomName,
			metadata: input.metadata,
		});
		return {
			serverUrl: cfg.url,
			roomName: input.roomName,
			participantToken: token,
		};
	});

export const startOutbound = protectedProcedure
	.route({
		method: "POST",
		path: "/telephony/outbound",
		tags: ["Telephony"],
		summary: "Start outbound room+dispatch",
	})
	.input(
		z.object({
			organizationId: z.string(),
			roomName: z.string().optional(),
			agentName: z.string(),
			metadata: z.record(z.string(), z.unknown()).optional(),
			phoneNumber: z.string().optional(),
			sipTrunkId: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const roomName =
			input.roomName ?? `OUTBOUND_${Math.floor(Math.random() * 100_000)}`;
		const metadata = input.metadata
			? JSON.stringify(input.metadata)
			: undefined;

		const result = await createOutboundRoomWithDispatch({
			roomName,
			agentName: input.agentName,
			metadata,
		});

		let sipParticipant = null;
		if (input.phoneNumber && input.sipTrunkId) {
			const trunk = await getSipTrunkById(input.sipTrunkId);
			if (!trunk?.livekitTrunkId) {
				throw new ORPCError("BAD_REQUEST", {
					message: "SIP trunk missing LiveKit id",
				});
			}
			sipParticipant = await createSipParticipant({
				trunkId: trunk.livekitTrunkId,
				phoneNumber: input.phoneNumber,
				roomName,
			});
		}

		return { ...result, sipParticipant };
	});

export const startEgress = protectedProcedure
	.route({
		method: "POST",
		path: "/telephony/egress",
		tags: ["Telephony"],
		summary: "Start room egress",
	})
	.input(
		z.object({
			organizationId: z.string(),
			roomName: z.string(),
			filepath: z.string(),
			campaignSessionId: z.string().optional(),
			audioOnly: z.boolean().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const remote = await startRoomCompositeEgress({
			roomName: input.roomName,
			filepath: input.filepath,
			audioOnly: input.audioOnly,
		});
		const job = await createEgressJob({
			organizationId: input.organizationId,
			type: "ROOM_COMPOSITE",
			campaignSessionId: input.campaignSessionId,
			livekitEgressId: remote.egressId,
			roomName: input.roomName,
			status: "ACTIVE",
		});
		return { job, remote };
	});

export const stopEgressJob = protectedProcedure
	.route({
		method: "POST",
		path: "/telephony/egress/{id}/stop",
		tags: ["Telephony"],
		summary: "Stop egress",
	})
	.input(z.object({ id: z.string(), livekitEgressId: z.string() }))
	.handler(async ({ input, context }) => {
		const existing = await getEgressJobById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);
		const remote = await stopEgress(input.livekitEgressId);
		const job = await updateEgressJob(input.id, { status: "COMPLETE" });
		return { job, remote };
	});

export const listEgressJobsProc = protectedProcedure
	.route({
		method: "GET",
		path: "/telephony/egress",
		tags: ["Telephony"],
		summary: "List egress jobs",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		return { egressJobs: await listEgressJobs(input.organizationId) };
	});

export const deleteTrunk = protectedProcedure
	.route({
		method: "DELETE",
		path: "/telephony/sip/trunks/{id}",
		tags: ["Telephony"],
		summary: "Delete SIP trunk",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const trunk = await getSipTrunkById(input.id);
		if (!trunk) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(trunk.organizationId, context.user.id);
		if (trunk.livekitTrunkId) {
			await deleteSipTrunk(trunk.livekitTrunkId);
		}
		await updateSipTrunk(input.id, {
			livekitTrunkId: null,
			metadata: { deleted: true },
		});
		return { success: true };
	});
