import { ARKIT_COUNT } from '../arkit';

/** Minimal prepared-phone shape used by the smoother (decoupled from evaluator). */
export interface SmoothablePhone {
  phone: string;
  start: number;
  end: number;
  mid: number;
  stress: number;
  weights: Float32Array;
  wordIndex?: number;
}

export interface PhonemeSmoothOptions {
  maxPhonesPerWord: number;
  backToBackGapSeconds: number;
  minPhoneDurationToKeep: number;
}

const CLOSURE_PHONES = new Set([
  'p',
  'b',
  'm',
  'f',
  'v',
  'w',
  't',
  'd',
  'n',
  'k',
  'g',
  'ʔ',
]);

const VOWEL_PHONES = new Set([
  'ɑ',
  'ɑː',
  'æ',
  'ʌ',
  'a',
  'ə',
  'ɛ',
  'e',
  'i',
  'iː',
  'ɪ',
  'u',
  'uː',
  'ʊ',
  'o',
  'oː',
  'ɔ',
  'ɔː',
  'ɒ',
  'ɝ',
  'aɪ',
  'aʊ',
  'ɔɪ',
  'eɪ',
  'oʊ',
  'ɪə',
  'eə',
  'ʊə',
]);

function isSilence(phone: string): boolean {
  return phone === 'sil' || phone === '[silence]' || phone === 'silence';
}

function durationOf(p: SmoothablePhone): number {
  return Math.max(1e-4, p.end - p.start);
}

/** Duration-weighted average of two ARKit weight buffers. */
export function mergeWeights(
  a: Float32Array,
  da: number,
  b: Float32Array,
  db: number,
): Float32Array {
  const out: Float32Array = new Float32Array(ARKIT_COUNT);
  const sum = Math.max(1e-6, da + db);
  for (let c = 0; c < ARKIT_COUNT; c++) {
    out[c] = (a[c] * da + b[c] * db) / sum;
  }
  return out;
}

function scorePhone(p: SmoothablePhone, minDuration: number): number {
  const dur = durationOf(p);
  const stressBoost = p.stress === 1 ? 1.5 : p.stress === 2 ? 1.2 : 1;
  const closureBoost = CLOSURE_PHONES.has(p.phone) ? 1.4 : 1;
  const vowelBoost = VOWEL_PHONES.has(p.phone) ? 1.2 : 1;
  // Short phones are penalized unless stressed
  const shortPenalty = dur < minDuration && p.stress === 0 ? 0.55 : 1;
  return dur * stressBoost * closureBoost * vowelBoost * shortPenalty;
}

function mergeInto(
  target: SmoothablePhone,
  skipped: SmoothablePhone,
): SmoothablePhone {
  const da = durationOf(target);
  const db = durationOf(skipped);
  const start = Math.min(target.start, skipped.start);
  const end = Math.max(target.end, skipped.end);
  return {
    phone: target.phone,
    start,
    end,
    mid: (start + end) * 0.5,
    stress: Math.max(target.stress, skipped.stress),
    weights: mergeWeights(target.weights, da, skipped.weights, db),
    wordIndex: target.wordIndex ?? skipped.wordIndex,
  };
}

/**
 * Within a word group, keep top-N phones by score and fold skipped phones
 * into nearest kept neighbors via duration-weighted weight merge.
 */
function thinWordGroup(
  group: SmoothablePhone[],
  maxKeep: number,
  minDuration: number,
): SmoothablePhone[] {
  if (group.length <= maxKeep) return group;

  const scored = group.map((p, i) => ({ p, i, score: scorePhone(p, minDuration) }));

  // Prefer keeping at least one stressed phone when present
  const stressed = scored.filter((s) => s.p.stress === 1);
  const keepIdx = new Set<number>();

  if (stressed.length) {
    stressed.sort((a, b) => b.score - a.score);
    keepIdx.add(stressed[0].i);
  }

  const byScore = [...scored].sort((a, b) => b.score - a.score || a.i - b.i);
  for (const s of byScore) {
    if (keepIdx.size >= maxKeep) break;
    keepIdx.add(s.i);
  }

  // Rebuild chronologically, folding skipped into nearest kept
  const kept: SmoothablePhone[] = [];
  const keptOriginalIdx: number[] = [];

  for (let i = 0; i < group.length; i++) {
    if (keepIdx.has(i)) {
      kept.push({ ...group[i], weights: group[i].weights.slice() });
      keptOriginalIdx.push(i);
    }
  }

  for (let i = 0; i < group.length; i++) {
    if (keepIdx.has(i)) continue;
    const skipped = group[i];
    // Nearest kept by original index distance
    let bestK = 0;
    let bestDist = Infinity;
    for (let k = 0; k < keptOriginalIdx.length; k++) {
      const d = Math.abs(keptOriginalIdx[k] - i);
      if (d < bestDist) {
        bestDist = d;
        bestK = k;
      }
    }
    kept[bestK] = mergeInto(kept[bestK], skipped);
  }

  // Ensure chronological order and contiguous coverage of original span
  kept.sort((a, b) => a.start - b.start || a.end - b.end);
  return kept;
}

/** Pass 1: thin phones within each word. Silence phones pass through unchanged. */
function thinByWord(
  phones: SmoothablePhone[],
  maxPhonesPerWord: number,
  minPhoneDurationToKeep: number,
): SmoothablePhone[] {
  if (!phones.length) return phones;

  const out: SmoothablePhone[] = [];
  let i = 0;
  while (i < phones.length) {
    const p = phones[i];
    if (isSilence(p.phone)) {
      out.push(p);
      i++;
      continue;
    }

    // Phones without wordIndex are singleton groups
    if (p.wordIndex === undefined) {
      out.push(p);
      i++;
      continue;
    }

    const wordIndex = p.wordIndex;
    const group: SmoothablePhone[] = [];
    while (
      i < phones.length &&
      !isSilence(phones[i].phone) &&
      phones[i].wordIndex === wordIndex
    ) {
      group.push(phones[i]);
      i++;
    }
    out.push(...thinWordGroup(group, maxPhonesPerWord, minPhoneDurationToKeep));
  }
  return out;
}

/**
 * Pass 2: merge back-to-back non-silence phones within gap threshold.
 * Only merges phones that share the same wordIndex so cross-word streams
 * (or inputs without word alignment) are not collapsed into one pose.
 */
function mergeBackToBack(
  phones: SmoothablePhone[],
  gapSeconds: number,
): SmoothablePhone[] {
  if (phones.length < 2) return phones;

  const out: SmoothablePhone[] = [];
  let current: SmoothablePhone = {
    ...phones[0],
    weights: phones[0].weights.slice(),
  };

  for (let i = 1; i < phones.length; i++) {
    const next = phones[i];
    const gap = next.start - current.end;
    const sameWord =
      current.wordIndex !== undefined && current.wordIndex === next.wordIndex;
    const canMerge =
      sameWord &&
      !isSilence(current.phone) &&
      !isSilence(next.phone) &&
      gap <= gapSeconds;

    if (canMerge) {
      const da = durationOf(current);
      const db = durationOf(next);
      const start = current.start;
      const end = next.end;
      current = {
        phone: da >= db ? current.phone : next.phone,
        start,
        end,
        mid: (start + end) * 0.5,
        stress: Math.max(current.stress, next.stress),
        weights: mergeWeights(current.weights, da, next.weights, db),
        wordIndex: current.wordIndex,
      };
    } else {
      out.push(current);
      current = { ...next, weights: next.weights.slice() };
    }
  }
  out.push(current);
  return out;
}

/**
 * Prep-time phoneme smoothing: thin weak phones within a word, then
 * duration-weighted merge back-to-back phones.
 */
export function smoothPreparedPhones<T extends SmoothablePhone>(
  phones: readonly T[],
  options: PhonemeSmoothOptions,
): T[] {
  const { maxPhonesPerWord, backToBackGapSeconds, minPhoneDurationToKeep } = options;
  if (!phones.length) return [];

  const asSmoothable: SmoothablePhone[] = phones.map((p) => ({
    phone: p.phone,
    start: p.start,
    end: p.end,
    mid: p.mid,
    stress: p.stress,
    weights: p.weights,
    wordIndex: p.wordIndex,
  }));

  const thinned = thinByWord(asSmoothable, maxPhonesPerWord, minPhoneDurationToKeep);
  const merged = mergeBackToBack(thinned, backToBackGapSeconds);
  return merged as T[];
}
