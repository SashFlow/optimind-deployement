import { ARKIT_INDEX, clamp01, type ARKitBlendshape } from '../arkit';

/**
 * Soften incompatible mouth shapes so they are not all at full intensity.
 * Mutates the weight buffer in place.
 */
export function applyConflictConstraints(weights: Float32Array): void {
  const jaw = weights[ARKIT_INDEX.jawOpen] ?? 0;
  const close = weights[ARKIT_INDEX.mouthClose] ?? 0;
  const pucker = weights[ARKIT_INDEX.mouthPucker] ?? 0;
  const funnel = weights[ARKIT_INDEX.mouthFunnel] ?? 0;
  const stretchL = weights[ARKIT_INDEX.mouthStretchLeft] ?? 0;
  const stretchR = weights[ARKIT_INDEX.mouthStretchRight] ?? 0;

  // Closure fights jaw open
  if (jaw > 0.15 && close > 0) {
    weights[ARKIT_INDEX.mouthClose] = clamp01(close * (1 - jaw * 0.85));
  }

  // Stretch fights pucker/funnel
  const round = Math.max(pucker, funnel);
  if (round > 0.2) {
    const damp = 1 - round * 0.7;
    weights[ARKIT_INDEX.mouthStretchLeft] = clamp01(stretchL * damp);
    weights[ARKIT_INDEX.mouthStretchRight] = clamp01(stretchR * damp);
  }

  // Extreme stretch reduces pucker
  const stretch = Math.max(stretchL, stretchR);
  if (stretch > 0.35) {
    const damp = 1 - stretch * 0.5;
    weights[ARKIT_INDEX.mouthPucker] = clamp01(pucker * damp);
    weights[ARKIT_INDEX.mouthFunnel] = clamp01(funnel * damp);
  }
}

export function applyGlobalScales(
  weights: Float32Array,
  scales: {
    jawScale: number;
    roundingScale: number;
    closureScale: number;
    stretchScale: number;
  },
): void {
  const scale = (name: ARKitBlendshape, s: number) => {
    const i = ARKIT_INDEX[name];
    weights[i] = clamp01((weights[i] ?? 0) * s);
  };

  scale('jawOpen', scales.jawScale);
  scale('mouthPucker', scales.roundingScale);
  scale('mouthFunnel', scales.roundingScale);
  scale('mouthClose', scales.closureScale);
  scale('mouthPressLeft', scales.closureScale);
  scale('mouthPressRight', scales.closureScale);
  scale('mouthStretchLeft', scales.stretchScale);
  scale('mouthStretchRight', scales.stretchScale);
}
