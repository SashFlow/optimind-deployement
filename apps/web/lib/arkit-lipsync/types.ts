import type { ARKitBlendshape } from "./arkit";

/**
 * Timestamped IPA phoneme.
 * Times are relative to the start of the generated audio clip (seconds).
 */
export interface TimedPhoneme {
  /** IPA symbol or phoneme sequence as emitted by TTS (may include stress markers). */
  phone: string;
  /** Start time in seconds relative to audio start. */
  start: number;
  /** End time in seconds relative to audio start. */
  end: number;
  /** Optional stress: 0 none, 1 primary, 2 secondary. */
  stress?: number;
  /** Optional Inworld/viseme hint for debugging (not used as primary mapping). */
  viseme?: string;
  /** Optional word index from Inworld WORD alignment (used by phoneme smoother). */
  wordIndex?: number;
}

export interface LipSyncInput {
  phonemes: TimedPhoneme[];
  /** Total audio duration in seconds. */
  duration: number;
}

export type PhonemeWeights = Partial<Record<ARKitBlendshape, number>>;

export interface PhonemeMapping {
  /** Sparse IPA → blendshape weights. Keys are normalized phone symbols. */
  phones: Record<string, PhonemeWeights>;
  /** Alias → canonical phone. */
  aliases?: Record<string, string>;
  /** Language code for this mapping layer (e.g. "en"). */
  language?: string;
  /** Fallback when phone is unknown: "neutral" | "viseme" | phone symbol. */
  unknownFallback?: "neutral" | string;
  version?: number;
}

export interface CoarticulationOptions {
  /** Anticipation lead-in before next phone (seconds). Default 0.04. */
  anticipationSeconds: number;
  /** Overlap window for blending adjacent phones (seconds). Default 0.05. */
  overlapSeconds: number;
  /** Attack duration for weight rise (seconds). Default 0.03. */
  attackSeconds: number;
  /** Release duration for weight fall (seconds). Default 0.04. */
  releaseSeconds: number;
  /** Global scale for jawOpen. Default 1. */
  jawScale: number;
  /** Global scale for lip rounding (pucker/funnel). Default 1. */
  roundingScale: number;
  /** Global scale for lip closure. Default 1. */
  closureScale: number;
  /** Global scale for horizontal stretch. Default 1. */
  stretchScale: number;
  /** Soften incompatible mouth shapes. Default true. */
  constrainConflicts: boolean;
  /** Thin/merge dense IPA streams before evaluation. Default true. */
  phonemeSmoothing: boolean;
  /** Max phones kept per word when smoothing. */
  maxPhonesPerWord: number;
  /** Merge adjacent phones closer than this gap (seconds). */
  backToBackGapSeconds: number;
  /** Drop phones shorter than this when thinning (seconds). */
  minPhoneDurationToKeep: number;
}

export const DEFAULT_COARTICULATION: CoarticulationOptions = {
  anticipationSeconds: 0.04,
  overlapSeconds: 0.05,
  attackSeconds: 0.03,
  releaseSeconds: 0.04,
  jawScale: 1,
  roundingScale: 1,
  closureScale: 1,
  stretchScale: 1,
  constrainConflicts: true,
  phonemeSmoothing: true,
  maxPhonesPerWord: 8,
  backToBackGapSeconds: 0.02,
  minPhoneDurationToKeep: 0.02,
};

export interface LipSyncOptions {
  mapping?: PhonemeMapping;
  coarticulation?: Partial<CoarticulationOptions>;
  /** Added to audio clock time when evaluating. */
  timeOffsetSeconds?: number;
  /** Morph target name aliases (avatar name → ARKit name). */
  morphAliases?: Record<string, string>;
  /** If true, only update SPEECH_BLENDSHAPES. Default true. */
  speechOnly?: boolean;
}

export type EnginePlaybackState = "stopped" | "playing" | "paused";

export type EditMode = "playback" | "phoneme" | "framePreview";
