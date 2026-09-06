export type Agent = {
	id: string;
	name: string;
};

export type PhoneNumber = {
	id: string;
	e164: string;
	provider_sid: string | null;
	assigned_agent_id: string | null;
	sip_trunk_id: string | null;
	is_active: boolean;
	friendly_name: string | null;
};

export type TrunkDirection = "inbound" | "outbound";

export type SipProvider =
	| "plivo"
	| "twilio"
	| "telnyx"
	| "livekit_phone"
	| "other";

export type SipTrunk = {
	id: string;
	name: string;
	direction: TrunkDirection;
	provider: string;
	transport: string;
	address: string | null;
	allowed_addresses: string[];
	status: string;
	numbers: string[];
	livekit_trunk_id: string | null;
};

export type SipDispatchRuleType = "individual" | "shared" | "callee";

export type DispatchRule = {
	id: string;
	name: string;
	sip_trunk_id: string | null;
	agent_id: string;
	rule_type: string;
	room_prefix: string | null;
	numbers: string[];
	is_enabled: boolean;
};

export type PlivoSearchResult = {
	number: string;
	monthly_rental_rate: string;
	setup_rate?: string;
	voice_enabled: boolean;
	sms_enabled: boolean;
	region?: string;
};

export function mapPhoneNumber(row: {
	id: string;
	e164: string;
	plivoNumberId?: string | null;
	agentId?: string | null;
	sipTrunkId?: string | null;
	friendlyName?: string | null;
	metadata?: unknown;
}): PhoneNumber {
	const meta =
		row.metadata && typeof row.metadata === "object"
			? (row.metadata as { deleted?: boolean; is_active?: boolean })
			: {};
	return {
		id: row.id,
		e164: row.e164,
		provider_sid: row.plivoNumberId ?? null,
		assigned_agent_id: row.agentId ?? null,
		sip_trunk_id: row.sipTrunkId ?? null,
		is_active: meta.deleted ? false : meta.is_active !== false,
		friendly_name: row.friendlyName ?? null,
	};
}

export function mapSipTrunk(row: {
	id: string;
	name: string;
	direction: string;
	numbers?: string[] | null;
	metadata?: unknown;
	livekitTrunkId?: string | null;
}): SipTrunk {
	const meta =
		row.metadata && typeof row.metadata === "object"
			? (row.metadata as { deleted?: boolean; address?: string })
			: {};
	const direction =
		row.direction.toLowerCase() === "outbound" ? "outbound" : "inbound";
	return {
		id: row.id,
		name: row.name,
		direction,
		provider: "plivo",
		transport: "udp",
		address: meta.address ?? null,
		allowed_addresses: [],
		status: meta.deleted
			? "deleted"
			: row.livekitTrunkId
				? "active"
				: "pending",
		numbers: row.numbers ?? [],
		livekit_trunk_id: row.livekitTrunkId ?? null,
	};
}

export function mapDispatchRule(row: {
	id: string;
	name: string;
	sipTrunkId?: string | null;
	agentId?: string | null;
	roomPrefix?: string | null;
	ruleConfig?: unknown;
	metadata?: unknown;
}): DispatchRule {
	const config =
		row.ruleConfig && typeof row.ruleConfig === "object"
			? (row.ruleConfig as { ruleType?: string; numbers?: string[] })
			: {};
	const meta =
		row.metadata && typeof row.metadata === "object"
			? (row.metadata as { deleted?: boolean })
			: {};
	return {
		id: row.id,
		name: row.name,
		sip_trunk_id: row.sipTrunkId ?? null,
		agent_id: row.agentId ?? "",
		rule_type: config.ruleType ?? "individual",
		room_prefix: row.roomPrefix ?? null,
		numbers: config.numbers ?? [],
		is_enabled: !meta.deleted,
	};
}
