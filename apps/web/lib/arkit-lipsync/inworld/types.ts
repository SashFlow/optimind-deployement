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
