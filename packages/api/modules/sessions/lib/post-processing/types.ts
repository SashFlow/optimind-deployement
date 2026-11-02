export type PostProcessingStatus =
	| "pending"
	| "running"
	| "completed"
	| "failed"
	| "skipped";

export type FaceLivenessResult = {
	livenessPass: boolean;
	confidence: number;
	signals: string[];
	summary: string;
};

export type IdExtractionResult = {
	extracted: Record<string, string>;
	confidence: number;
	summary: string;
};

export type BodyVitalsEstimate = {
	heightCm: number | null;
	weightKg: number | null;
	bmi: number | null;
	heartRateBpm: number | null;
	respiratoryRate: number | null;
	fitnessAssessment: string;
};

export type BodyPhysicalCondition = {
	impairments: string[];
	mobilityLimitations: string[];
	postureNotes: string;
	assistiveDevices: string[];
	otherFindings: string[];
};

export type BodyUnderwriting = {
	identityStatus: string;
	livenessStatus: string;
	riskIndicators: string[];
	exceptionFlags: string[];
	underwriterReviewRecommended: boolean;
	summary: string;
};

export type BodyAssessmentResult = {
	vitals: BodyVitalsEstimate;
	physicalCondition: BodyPhysicalCondition;
	underwriting: BodyUnderwriting;
	videoUnavailable?: boolean;
};

export type PostProcessingResult = {
	status: PostProcessingStatus;
	startedAt?: string;
	completedAt?: string;
	error?: string;
	model?: string;
	face?: FaceLivenessResult;
	idCard?: IdExtractionResult;
	body?: BodyAssessmentResult;
	reportFileId?: string;
	/** Prior run used stills only; allow one retry when egress video becomes ready. */
	videoUnavailable?: boolean;
};

export type PostProcessingConfig = {
	enabled: boolean;
	model: string;
	prompts: {
		face_liveness: string;
		id_extraction: string;
		body_assessment: string;
	};
};

export type MediaPart = {
	mimeType: string;
	bytes: Buffer;
};
