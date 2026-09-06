import {
	AccessToken,
	type AccessTokenOptions,
	AgentDispatchClient,
	EgressClient,
	EncodedFileOutput,
	EncodedFileType,
	RoomServiceClient,
	SipClient,
	S3Upload,
	type VideoGrant,
	WebhookReceiver,
} from "livekit-server-sdk";
import { SIPTransport, type RoomConfiguration } from "@livekit/protocol";
import {
	getLiveKitConfig,
	livekitHttpHost,
	type LiveKitConfig,
} from "./config";
import {
	buildS3Upload,
	type EgressS3Config,
} from "./egress-s3";

export {
	buildS3Upload,
	getEgressS3Config,
	recordingFilepath,
} from "./egress-s3";
export type { EgressS3Config } from "./egress-s3";

function clients(config?: LiveKitConfig) {
	const cfg = config ?? getLiveKitConfig();
	const host = livekitHttpHost(cfg.url);
	return {
		cfg,
		host,
		rooms: new RoomServiceClient(host, cfg.apiKey, cfg.apiSecret),
		sip: new SipClient(host, cfg.apiKey, cfg.apiSecret),
		egress: new EgressClient(host, cfg.apiKey, cfg.apiSecret),
		dispatch: new AgentDispatchClient(host, cfg.apiKey, cfg.apiSecret),
	};
}

export async function createRoom(opts: {
	name: string;
	metadata?: string;
	emptyTimeout?: number;
	maxParticipants?: number;
	config?: LiveKitConfig;
}) {
	const { rooms } = clients(opts.config);
	return rooms.createRoom({
		name: opts.name,
		metadata: opts.metadata,
		emptyTimeout: opts.emptyTimeout ?? 60 * 10,
		maxParticipants: opts.maxParticipants ?? 10,
	});
}

export async function deleteRoom(roomName: string, config?: LiveKitConfig) {
	const { rooms } = clients(config);
	return rooms.deleteRoom(roomName);
}

export async function createParticipantToken(opts: {
	identity: string;
	name?: string;
	roomName: string;
	ttl?: string;
	metadata?: string;
	roomConfig?: RoomConfiguration;
	config?: LiveKitConfig;
}): Promise<string> {
	const cfg = opts.config ?? getLiveKitConfig();
	const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
		identity: opts.identity,
		name: opts.name,
		ttl: opts.ttl ?? "15m",
		metadata: opts.metadata,
	} satisfies AccessTokenOptions);

	const grant: VideoGrant = {
		room: opts.roomName,
		roomJoin: true,
		canPublish: true,
		canPublishData: true,
		canSubscribe: true,
	};
	at.addGrant(grant);

	if (opts.roomConfig) {
		at.roomConfig = opts.roomConfig;
	}

	return at.toJwt();
}

export async function createAgentDispatch(opts: {
	roomName: string;
	agentName: string;
	metadata?: string;
	config?: LiveKitConfig;
}) {
	const { dispatch } = clients(opts.config);
	return dispatch.createDispatch(opts.roomName, opts.agentName, {
		metadata: opts.metadata,
	});
}

export async function createInboundSipTrunk(opts: {
	name: string;
	numbers: string[];
	metadata?: string;
	config?: LiveKitConfig;
}) {
	const { sip } = clients(opts.config);
	return sip.createSipInboundTrunk(opts.name, opts.numbers, {
		metadata: opts.metadata,
	});
}

export async function createOutboundSipTrunk(opts: {
	name: string;
	address: string;
	numbers: string[];
	authUsername?: string;
	authPassword?: string;
	metadata?: string;
	transport?: number;
	config?: LiveKitConfig;
}) {
	const { sip } = clients(opts.config);
	return sip.createSipOutboundTrunk(opts.name, opts.address, opts.numbers, {
		transport: opts.transport ?? SIPTransport.SIP_TRANSPORT_AUTO,
		authUsername: opts.authUsername,
		authPassword: opts.authPassword,
		metadata: opts.metadata,
	});
}

export async function listInboundSipTrunks(config?: LiveKitConfig) {
	const { sip } = clients(config);
	return sip.listSipInboundTrunk();
}

export async function listOutboundSipTrunks(config?: LiveKitConfig) {
	const { sip } = clients(config);
	return sip.listSipOutboundTrunk();
}

export async function deleteSipTrunk(
	sipTrunkId: string,
	config?: LiveKitConfig,
) {
	const { sip } = clients(config);
	return sip.deleteSipTrunk(sipTrunkId);
}

export async function createSipDispatchRule(opts: {
	name: string;
	trunkIds?: string[];
	roomPrefix?: string;
	agentName?: string;
	metadata?: string;
	config?: LiveKitConfig;
}) {
	const { sip } = clients(opts.config);
	return sip.createSipDispatchRule(
		{
			type: "individual",
			roomPrefix: opts.roomPrefix ?? "call-",
		},
		{
			name: opts.name,
			trunkIds: opts.trunkIds,
			metadata: opts.metadata,
			roomConfig: opts.agentName
				? ({
						agents: [{ agentName: opts.agentName }],
					} as RoomConfiguration)
				: undefined,
		},
	);
}

export async function listSipDispatchRules(config?: LiveKitConfig) {
	const { sip } = clients(config);
	return sip.listSipDispatchRule();
}

export async function deleteSipDispatchRule(
	sipDispatchRuleId: string,
	config?: LiveKitConfig,
) {
	const { sip } = clients(config);
	return sip.deleteSipDispatchRule(sipDispatchRuleId);
}

export async function createSipParticipant(opts: {
	trunkId: string;
	phoneNumber: string;
	roomName: string;
	participantIdentity?: string;
	participantName?: string;
	playDialtone?: boolean;
	config?: LiveKitConfig;
}) {
	const { sip } = clients(opts.config);
	return sip.createSipParticipant(
		opts.trunkId,
		opts.phoneNumber,
		opts.roomName,
		{
			participantIdentity: opts.participantIdentity,
			participantName: opts.participantName,
			playDialtone: opts.playDialtone,
		},
	);
}

export async function startRoomCompositeEgress(opts: {
	roomName: string;
	filepath: string;
	audioOnly?: boolean;
	s3?: EgressS3Config | S3Upload | null;
	config?: LiveKitConfig;
}) {
	const { egress } = clients(opts.config);
	let s3: S3Upload | undefined;
	if (opts.s3 instanceof S3Upload) {
		s3 = opts.s3;
	} else if (opts.s3 === null) {
		s3 = undefined;
	} else if (opts.s3) {
		s3 = buildS3Upload(opts.s3);
	} else {
		s3 = buildS3Upload();
	}

	const output = new EncodedFileOutput({
		fileType: EncodedFileType.MP4,
		filepath: opts.filepath,
		...(s3 ? { output: { case: "s3" as const, value: s3 } } : {}),
	});
	return egress.startRoomCompositeEgress(opts.roomName, output, {
		audioOnly: opts.audioOnly ?? false,
	});
}

export async function listEgress(opts?: {
	roomName?: string;
	egressId?: string;
	config?: LiveKitConfig;
}) {
	const { egress } = clients(opts?.config);
	return egress.listEgress({
		roomName: opts?.roomName,
		egressId: opts?.egressId,
	});
}

export async function stopEgress(egressId: string, config?: LiveKitConfig) {
	const { egress } = clients(config);
	return egress.stopEgress(egressId);
}

export function createWebhookReceiver(config?: LiveKitConfig) {
	const cfg = config ?? getLiveKitConfig();
	return new WebhookReceiver(cfg.apiKey, cfg.apiSecret);
}

export async function createOutboundRoomWithDispatch(opts: {
	roomName: string;
	agentName: string;
	metadata?: string;
	config?: LiveKitConfig;
}) {
	await createRoom({
		name: opts.roomName,
		metadata: opts.metadata,
		emptyTimeout: 5 * 60,
		config: opts.config,
	});
	const dispatch = await createAgentDispatch({
		roomName: opts.roomName,
		agentName: opts.agentName,
		metadata: opts.metadata,
		config: opts.config,
	});
	return { roomName: opts.roomName, dispatch };
}
