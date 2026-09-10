import {
	createAgentSession,
	createWorkflowApproval,
	getAgentById,
	getCampaignById,
	searchChunks,
} from "@repo/database";
import {
	createOutboundRoomWithDispatch,
	getLiveKitConfig,
} from "@repo/livekit";
import { sendEmail } from "@repo/mail";
import OpenAI from "openai";
import { embedTexts } from "../../knowledge/lib/embeddings";
import {
	buildDispatchMetadata,
	serializeDispatchMetadata,
} from "../../sessions/lib/dispatch-metadata";
import type { NodeHandlerArgs, NodeHandlerResult } from "../types";
import { resolveTemplate, resolveValue } from "../lib/template";

const AGENT_NAME = process.env.AGENT_NAME || "demo-agent";

function configRecordingEnabled(config: unknown): boolean {
	if (!config || typeof config !== "object") return false;
	const c = config as {
		recording_enabled?: boolean;
		recordingEnabled?: boolean;
	};
	return Boolean(c.recording_enabled ?? c.recordingEnabled);
}

export async function handleKnowledgeRetrieve(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const cfg = args.node.data.config;
	const query = String(
		resolveTemplate(String(cfg.query ?? ""), args.context),
	);
	if (!query) throw new Error("Knowledge node requires query");

	const campaign = await getCampaignById(args.run.campaignId);
	const kbIds: string[] = Array.isArray(cfg.knowledgeBaseIds)
		? (cfg.knowledgeBaseIds as string[])
		: (campaign?.knowledgeBases.map((k) => k.knowledgeBaseId) ?? []);

	if (!kbIds.length) {
		return { kind: "success", output: { chunks: [], query } };
	}

	const model = String(cfg.embeddingModel ?? "text-embedding-3-small");
	const [embedding] = await embedTexts([query], model);
	const k = Number(cfg.k ?? 5);
	const allChunks = [];
	for (const kbId of kbIds) {
		const chunks = await searchChunks(kbId, embedding, k);
		allChunks.push(...chunks);
	}
	allChunks.sort(
		(a, b) => ((b as { score?: number }).score ?? 0) - ((a as { score?: number }).score ?? 0),
	);
	const top = allChunks.slice(0, k);
	return {
		kind: "success",
		output: {
			query,
			chunks: top,
			text: top.map((c) => (c as { content?: string }).content ?? "").join("\n\n"),
		},
	};
}

export async function handleLlm(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const cfg = args.node.data.config;
	const prompt = String(resolveTemplate(String(cfg.prompt ?? ""), args.context));
	const system = cfg.system
		? String(resolveTemplate(String(cfg.system), args.context))
		: undefined;
	const model = String(cfg.model ?? "gpt-4o-mini");
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

	const openai = new OpenAI({ apiKey });
	const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
	if (system) messages.push({ role: "system", content: system });
	messages.push({ role: "user", content: prompt });

	const completion = await openai.chat.completions.create({
		model,
		messages,
		temperature: Number(cfg.temperature ?? 0.7),
	});
	const text = completion.choices[0]?.message?.content ?? "";
	return {
		kind: "success",
		output: {
			text,
			model,
			usage: completion.usage ?? null,
		},
	};
}

export async function handleAgent(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const cfg = args.node.data.config;
	const campaign = await getCampaignById(args.run.campaignId);
	if (!campaign) throw new Error("Campaign not found");

	const agentId = String(cfg.agentId ?? campaign.agentId);
	const agent = await getAgentById(agentId);
	if (!agent?.publishedVersion) {
		throw new Error("Agent has no published version");
	}
	const version = agent.publishedVersion;
	const configSnapshot = version.config ?? {};
	const modality = String(cfg.modality ?? "voice").toLowerCase(); // voice | avatar
	const channel =
		String(cfg.channel ?? (modality === "avatar" ? "WEB" : campaign.channel === "VOICE" ? "PHONE" : "WEB")) ===
		"PHONE"
			? "PHONE"
			: "WEB";
	const direction = String(cfg.direction ?? "OUTBOUND") as
		| "NONE"
		| "INBOUND"
		| "OUTBOUND"
		| "WEB";
	const phoneNumber = cfg.phoneNumber
		? String(resolveTemplate(String(cfg.phoneNumber), args.context))
		: undefined;
	const contactMetadata = (resolveValue(cfg.contactMetadata ?? {}, args.context) ??
		{}) as Record<string, unknown>;

	const roomName = `wf-${args.run.id.slice(0, 8)}-${args.node.id.slice(0, 6)}-${Date.now()}`;
	const recordingEnabled =
		cfg.recordingEnabled !== undefined
			? Boolean(cfg.recordingEnabled)
			: configRecordingEnabled(configSnapshot);

	const session = await createAgentSession({
		organizationId: args.run.organizationId,
		agentId: agent.id,
		agentVersionId: version.id,
		livekitRoomName: roomName,
		channel: channel as "WEB" | "SIP" | "PHONE",
		direction,
		toNumber: phoneNumber,
		configSnapshot,
		recordingEnabled,
		metadata: {
			source: "campaign",
			campaignId: args.run.campaignId,
			workflowRunId: args.run.id,
			workflowStepId: args.stepId,
			modality,
		},
	});

	const dispatchMetadata = await buildDispatchMetadata({
		organization_id: args.run.organizationId,
		agent_id: agent.id,
		agent_version_id: version.id,
		session_id: session.id,
		config: configSnapshot as Record<string, unknown>,
		source: "campaign",
		campaign_id: args.run.campaignId,
		campaign_contact_id: null,
		phone_number: phoneNumber ?? null,
		from_number: null,
		sip_trunk_id: null,
		livekit_sip_trunk_id: null,
		direction,
		channel: channel as "WEB" | "SIP" | "PHONE",
		contact_metadata: contactMetadata,
		recording_enabled: recordingEnabled,
	});

	await createOutboundRoomWithDispatch({
		roomName,
		agentName: String(cfg.agentName ?? AGENT_NAME),
		metadata: serializeDispatchMetadata(dispatchMetadata),
	});

	const livekit = getLiveKitConfig();

	return {
		kind: "wait",
		output: {
			sessionId: session.id,
			status: session.status,
			roomName,
			serverUrl: livekit.url,
			modality,
			channel,
		},
		wait: {
			waitKind: "AGENT_SESSION",
			externalId: session.id,
			payload: { sessionId: session.id },
		},
	};
}

export async function handleHumanApproval(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const cfg = args.node.data.config;
	const channel = String(cfg.channel ?? "WEB").toUpperCase() === "EMAIL" ? "EMAIL" : "WEB";
	const message = String(
		resolveTemplate(String(cfg.message ?? "Approval required"), args.context),
	);
	const emailTo = cfg.emailTo
		? String(resolveTemplate(String(cfg.emailTo), args.context))
		: undefined;
	const expiresInHours = Number(cfg.expiresInHours ?? 72);
	const expiresAt = new Date(Date.now() + expiresInHours * 3600_000);

	// Wait row is created by runner; we return wait descriptor first.
	// Approval record is created in runner after wait insert — use payload marker.
	if (channel === "EMAIL" && emailTo) {
		// Email sent after approval token exists (runner post-hook via payload flag)
	}

	return {
		kind: "wait",
		output: {
			channel,
			message,
			emailTo: emailTo ?? null,
			expiresAt: expiresAt.toISOString(),
		},
		wait: {
			waitKind: "HUMAN_APPROVAL",
			resumeAt: expiresAt,
			payload: {
				channel,
				message,
				emailTo: emailTo ?? null,
				expiresAt: expiresAt.toISOString(),
			},
		},
	};
}

/** Called by runner after WorkflowWait + step are created for human approval */
export async function finalizeHumanApprovalWait(params: {
	organizationId: string;
	runId: string;
	stepId: string;
	waitId: string;
	channel: "WEB" | "EMAIL";
	message: string;
	emailTo?: string | null;
	expiresAt?: Date | null;
	appBaseUrl: string;
}) {
	const approval = await createWorkflowApproval({
		organizationId: params.organizationId,
		runId: params.runId,
		stepId: params.stepId,
		waitId: params.waitId,
		channel: params.channel,
		message: params.message,
		emailTo: params.emailTo,
		expiresAt: params.expiresAt,
	});

	const approveUrl = `${params.appBaseUrl}/api/workflows/approvals/${approval.token}?decision=APPROVED`;
	const rejectUrl = `${params.appBaseUrl}/api/workflows/approvals/${approval.token}?decision=REJECTED`;
	const webUrl = `${params.appBaseUrl}/app/workflows/approvals/${approval.token}`;

	if (params.channel === "EMAIL" && params.emailTo) {
		await sendEmail({
			to: params.emailTo,
			subject: "Workflow approval required",
			html: `<p>${params.message}</p>
<p><a href="${approveUrl}">Approve</a> · <a href="${rejectUrl}">Reject</a></p>
<p>Or open: <a href="${webUrl}">${webUrl}</a></p>`,
			text: `${params.message}\nApprove: ${approveUrl}\nReject: ${rejectUrl}`,
		});
	}

	return { approval, approveUrl, rejectUrl, webUrl };
}
