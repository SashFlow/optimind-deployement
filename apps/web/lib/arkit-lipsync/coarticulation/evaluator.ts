import {
  ARKIT_COUNT,
  ARKIT_INDEX,
  clamp01,
  recordToWeights,
  type ARKitBlendshape,
} from '../arkit';
import { normalizePhone } from '../ipa/tokenize';
import { applyConflictConstraints, applyGlobalScales } from '../mapping/constraints';
import { DEFAULT_MAPPING, resolvePhoneWeights } from '../mapping/defaultMapping';
import { smoothPreparedPhones } from '../smooth/phonemeSmoother';
import type {
  CoarticulationOptions,
  LipSyncInput,
  PhonemeMapping,
  TimedPhoneme,
} from '../types';
import { DEFAULT_COARTICULATION } from '../types';

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

interface PreparedPhone {
  phone: string;
  start: number;
  end: number;
  mid: number;
  stress: number;
  weights: Float32Array;
  wordIndex?: number;
}

export class CoarticulationEvaluator {
  private prepared: PreparedPhone[] = [];
  private options: CoarticulationOptions;
  private mapping: PhonemeMapping;
  private languageOverride: PhonemeMapping | null = null;
  private avatarOverride: PhonemeMapping | null = null;
  private avatarLanguageOverride: PhonemeMapping | null = null;
  private duration = 0;

  /** Reused output buffer — do not retain across calls without copying. */
  readonly output = new Float32Array(ARKIT_COUNT);
  private readonly tmpA = new Float32Array(ARKIT_COUNT);

  constructor(
    mapping: PhonemeMapping = DEFAULT_MAPPING,
    options: Partial<CoarticulationOptions> = {},
  ) {
    this.mapping = mapping;
    this.options = { ...DEFAULT_COARTICULATION, ...options };
  }

  setOptions(partial: Partial<CoarticulationOptions>): void {
    this.options = { ...this.options, ...partial };
  }

  getOptions(): CoarticulationOptions {
    return { ...this.options };
  }

  setMapping(mapping: PhonemeMapping): void {
    this.mapping = mapping;
    this.reapplyWeights();
  }

  setOverrideLayers(layers: {
    language?: PhonemeMapping | null;
    avatar?: PhonemeMapping | null;
    avatarLanguage?: PhonemeMapping | null;
  }): void {
    if (layers.language !== undefined) this.languageOverride = layers.language;
    if (layers.avatar !== undefined) this.avatarOverride = layers.avatar;
    if (layers.avatarLanguage !== undefined) this.avatarLanguageOverride = layers.avatarLanguage;
    this.reapplyWeights();
  }

  /** Update mapping for a single phone and refresh prepared weights. */
  updatePhoneWeights(phone: string, weights: Partial<Record<ARKitBlendshape, number>>): void {
    const aliases = this.mapping.aliases ?? {};
    const norm = normalizePhone(phone, aliases);
    this.mapping = {
      ...this.mapping,
      phones: { ...this.mapping.phones, [norm.phone]: { ...weights } },
    };
    this.reapplyWeights();
  }

  getMapping(): PhonemeMapping {
    return this.mapping;
  }

  setPhonemes(input: LipSyncInput): void {
    this.duration = input.duration;
    const aliases = {
      ...DEFAULT_MAPPING.aliases,
      ...this.mapping.aliases,
    };

    const cleaned = sanitizePhonemes(input.phonemes);
    const mapped: PreparedPhone[] = cleaned.map((p) => {
      const norm = normalizePhone(p.phone, aliases);
      const sparse = resolvePhoneWeights(norm.phone, {
        builtin: DEFAULT_MAPPING,
        language: this.languageOverride ?? (this.mapping.language ? this.mapping : null),
        avatar: this.avatarOverride,
        avatarLanguage: this.avatarLanguageOverride,
      });
      // Active mapping phones override builtin for this key
      const fromActive = this.mapping.phones[norm.phone];
      const merged = fromActive ? { ...sparse, ...fromActive } : sparse;
      const w = recordToWeights(merged);
      // Stress slightly increases jaw
      if (norm.stress === 1 || p.stress === 1) {
        w[ARKIT_INDEX.jawOpen] = clamp01((w[ARKIT_INDEX.jawOpen] ?? 0) * 1.12);
      }
      return {
        phone: norm.phone,
        start: p.start,
        end: p.end,
        mid: (p.start + p.end) * 0.5,
        stress: norm.stress || p.stress || 0,
        weights: w,
        wordIndex: p.wordIndex,
      };
    });

    this.prepared = this.options.phonemeSmoothing
      ? smoothPreparedPhones(mapped, {
          maxPhonesPerWord: this.options.maxPhonesPerWord,
          backToBackGapSeconds: this.options.backToBackGapSeconds,
          minPhoneDurationToKeep: this.options.minPhoneDurationToKeep,
        })
      : mapped;
  }

  private reapplyWeights(): void {
    if (!this.prepared.length) return;
    const snapshot: LipSyncInput = {
      duration: this.duration,
      phonemes: this.prepared.map((p) => ({
        phone: p.phone,
        start: p.start,
        end: p.end,
        stress: p.stress,
        wordIndex: p.wordIndex,
      })),
    };
    this.setPhonemes(snapshot);
  }

  getPrepared(): readonly PreparedPhone[] {
    return this.prepared;
  }

  getDuration(): number {
    return this.duration;
  }

  phoneAt(timeSeconds: number): PreparedPhone | null {
    if (!this.prepared.length) return null;
    for (const p of this.prepared) {
      if (timeSeconds >= p.start && timeSeconds < p.end) return p;
    }
    // Nearest if between gaps
    let best: PreparedPhone | null = null;
    let bestDist = Infinity;
    for (const p of this.prepared) {
      const d =
        timeSeconds < p.start ? p.start - timeSeconds : timeSeconds >= p.end ? timeSeconds - p.end : 0;
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return bestDist < 0.08 ? best : null;
  }

  /**
   * Deterministic evaluation at an audio-relative timestamp.
   * Returns the internal output buffer (reused).
   */
  evaluate(timeSeconds: number): Float32Array {
    this.output.fill(0);
    if (!this.prepared.length) return this.output;

    const { anticipationSeconds, overlapSeconds, attackSeconds, releaseSeconds } = this.options;

    // Accumulate weighted contributions from nearby phones
    this.tmpA.fill(0);
    let totalInfluence = 0;

    for (let i = 0; i < this.prepared.length; i++) {
      const p = this.prepared[i];
      const next = this.prepared[i + 1];
      const prev = this.prepared[i - 1];

      const winStart = p.start - anticipationSeconds - (prev ? overlapSeconds * 0.5 : 0);
      const winEnd = p.end + releaseSeconds + (next ? overlapSeconds * 0.5 : 0);

      if (timeSeconds < winStart || timeSeconds > winEnd) continue;

      let influence = 1;

      // Attack from window start / phone start
      const attackEnd = p.start + Math.min(attackSeconds, Math.max(0.001, (p.end - p.start) * 0.35));
      if (timeSeconds < p.start) {
        // Anticipation ramp
        const t = (timeSeconds - winStart) / Math.max(1e-4, p.start - winStart);
        influence = smoothstep(t) * 0.65;
      } else if (timeSeconds < attackEnd) {
        const t = (timeSeconds - p.start) / Math.max(1e-4, attackEnd - p.start);
        influence = smoothstep(t);
      } else if (timeSeconds <= p.end) {
        influence = 1;
        // Soft overlap toward next
        if (next && timeSeconds > p.end - overlapSeconds) {
          const t = (p.end - timeSeconds) / Math.max(1e-4, overlapSeconds);
          influence = 0.5 + 0.5 * smoothstep(t);
        }
      } else {
        // Release
        const t = 1 - (timeSeconds - p.end) / Math.max(1e-4, winEnd - p.end);
        influence = smoothstep(t);
      }

      if (influence <= 1e-4) continue;

      for (let c = 0; c < ARKIT_COUNT; c++) {
        this.tmpA[c] += p.weights[c] * influence;
      }
      totalInfluence += influence;
    }

    if (totalInfluence > 1e-6) {
      // Soft normalize when overlapping influences exceed 1
      const norm = totalInfluence > 1.15 ? 1.15 / totalInfluence : 1;
      for (let c = 0; c < ARKIT_COUNT; c++) {
        this.output[c] = clamp01(this.tmpA[c] * norm);
      }
    }

    applyGlobalScales(this.output, this.options);
    if (this.options.constrainConflicts) applyConflictConstraints(this.output);

    return this.output;
  }

  /** Apply only the target pose for a phone (no coarticulation) — for calibration preview. */
  evaluatePhonePose(phone: string): Float32Array {
    this.output.fill(0);
    const aliases = { ...DEFAULT_MAPPING.aliases, ...this.mapping.aliases };
    const norm = normalizePhone(phone, aliases);
    const sparse =
      this.mapping.phones[norm.phone] ??
      resolvePhoneWeights(norm.phone, {
        builtin: DEFAULT_MAPPING,
        language: this.languageOverride,
        avatar: this.avatarOverride,
        avatarLanguage: this.avatarLanguageOverride,
      });
    recordToWeights(sparse, this.output);
    applyGlobalScales(this.output, this.options);
    if (this.options.constrainConflicts) applyConflictConstraints(this.output);
    return this.output;
  }
}

export function sanitizePhonemes(phonemes: TimedPhoneme[]): TimedPhoneme[] {
  const out: TimedPhoneme[] = [];
  for (const p of phonemes) {
    let start = Number.isFinite(p.start) ? p.start : 0;
    let end = Number.isFinite(p.end) ? p.end : start;
    if (end < start) [start, end] = [end, start];
    // Zero-duration: give a tiny epsilon so influence can still fire at that instant
    if (end === start) end = start + 0.001;
    out.push({
      phone: p.phone ?? 'sil',
      start,
      end,
      stress: p.stress,
      viseme: p.viseme,
      wordIndex: p.wordIndex,
    });
  }
  out.sort((a, b) => a.start - b.start || a.end - b.end);
  return out;
}
