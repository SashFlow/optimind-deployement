export interface InworldPhone {
	phoneSymbol: string;
	startTimeSeconds: number;
	durationSeconds: number;
	visemeSymbol?: string;
}

export interface InworldPhoneticDetail {
	wordIndex: number;
	phones: InworldPhone[];
	isPartial?: boolean;
}

export interface InworldWordAlignment {
	words?: string[];
	wordStartTimeSeconds?: number[];
	wordEndTimeSeconds?: number[];
	phoneticDetails?: InworldPhoneticDetail[];
}

export interface InworldTimestampInfo {
	wordAlignment?: InworldWordAlignment;
}

export interface InworldSynthesizeResponse {
	audioContent?: string; // base64
	timestampInfo?: InworldTimestampInfo;
}

export interface InworldSynthesizeRequest {
	text: string;
	voiceId: string;
	modelId?: string;
	timestampType?: "WORD" | "CHARACTER" | "TIMESTAMP_TYPE_UNSPECIFIED";
}

export interface CachedTtsEntry {
	cacheKey: string;
	text: string;
	voiceId: string;
	modelId: string;
	timestampType: string;
	audioBlob: Blob;
	phonemesJson: string;
	duration: number;
	createdAt: string;
	fromCache: boolean;
}
