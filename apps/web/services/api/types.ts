export type Agent = {
	id: string;
	name: string;
};

export type AgentDailyStats = {
	date: string;
	count: number;
	completed: number;
	failed: number;
};

export type DashboardStats = {
	total_sessions: number;
	active_sessions: number;
	completed_sessions: number;
	avg_duration_ms: number | null;
	failure_rate: number | null;
	daily: AgentDailyStats[];
	by_channel: Record<string, number>;
};

export type AnalyticsLabelPct = {
	label: string;
	pct: number;
};

export type AnalyticsLabelMinutes = {
	label: string;
	minutes: number;
};

export type AnalyticsCountryRank = {
	rank: number;
	name: string;
	count: number;
};

export type DashboardAnalytics = {
	livekit: {
		available: boolean;
		message?: string;
		connection_success_pct: number | null;
		platforms: AnalyticsLabelPct[];
		connection_types: AnalyticsLabelPct[];
		top_countries: AnalyticsCountryRank[];
		webrtc_participant_minutes: number;
		participant_minutes_by_kind: AnalyticsLabelMinutes[];
		participants_daily: Array<{ date: string; count: number }>;
		data_transfer_daily: Array<{
			date: string;
			downstream: number;
			upstream: number;
		}>;
		total_upstream_bytes: number;
		total_downstream_bytes: number;
	};
	telephony: {
		minutes_daily: Array<{
			date: string;
			inbound_ms: number;
			outbound_ms: number;
			total_ms: number;
		}>;
		sip_sessions_daily: Array<{ date: string; count: number }>;
		total_inbound_ms: number;
		total_outbound_ms: number;
		sip_sessions_total: number;
	};
	egress: {
		by_type_daily: Array<{
			date: string;
			participant: number;
			room_composite: number;
			track: number;
			web: number;
		}>;
		total_count: number;
		total_billable_duration_ms: number;
		total_track_duration_ms: number;
	};
};

export type OrgAvatar = {
	id: string;
	display_name: string;
	preview_url: string | null;
	external_avatar_id: string;
	provider_id: string | null;
	is_enabled: boolean;
};

export type Provider = {
	id: string;
	display_name: string;
};

export type ProviderModel = {
	id: string;
	display_name: string;
	provider_id: string;
	is_enabled: boolean;
	delivery_mode: "hosted" | "byok";
	kind: "llm" | "realtime" | "stt" | "tts";
	supports_text_output?: boolean;
};

export type ProviderVoice = {
	id: string;
	voice_id: string;
	label: string;
	preview_url?: string | null;
	provider_model_id: string;
};

export type ToolDefinition = {
	id: string;
	name: string;
	description: string;
	tool_type: "http" | "python";
	config: Record<string, unknown>;
	parameters_schema: Record<string, unknown>;
};

export type ToolCreateInput = {
	name: string;
	description: string;
	tool_type: "http" | "python";
	config: Record<string, unknown>;
	parameters_schema: Record<string, unknown>;
};

export type KnowledgeSource = {
	id: string;
	name: string;
	description: string | null;
	status: "published" | "draft";
	document_count: number;
};

export type KnowledgeDocumentSourceType = "UPLOAD" | "URL" | "TEXT" | "API";

export type KnowledgeDocumentStatus =
	| "PENDING"
	| "PROCESSING"
	| "READY"
	| "FAILED"
	| "DELETED";

export type KnowledgeDocument = {
	id: string;
	title: string;
	sourceType: KnowledgeDocumentSourceType;
	sourceUrl: string | null;
	status: KnowledgeDocumentStatus;
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
};

export type KnowledgeBaseDetail = {
	id: string;
	name: string;
	description: string | null;
	status: string;
	documents: KnowledgeDocument[];
};

export type CreateDocumentInput = {
	title?: string;
	sourceType: KnowledgeDocumentSourceType;
	sourceUrl?: string;
	content?: string;
	file?: File;
};
