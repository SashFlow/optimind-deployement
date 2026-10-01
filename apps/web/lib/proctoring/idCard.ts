import type { IdCaptureConfig } from '@/lib/proctoring/config';

/** Rectangle normalised to the raw (un-mirrored) video frame, 0-1 on both axes. */
export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type IdCaptureHint =
  | 'position'
  | 'align'
  | 'too_dark'
  | 'too_bright'
  | 'glare'
  | 'blurry'
  | 'hold_steady';

export const ID_CAPTURE_HINTS: Record<IdCaptureHint, string> = {
  position: 'Place the front of your ID card inside the frame',
  align: 'Line up all four edges of the card with the frame',
  too_dark: 'It is too dark, move somewhere brighter',
  too_bright: 'It is too bright, move away from direct light',
  glare: 'Tilt the card slightly to remove glare',
  blurry: 'Hold the card still so the text is sharp',
  hold_steady: 'Hold steady…',
};

export interface IdCardDetection {
  /** A card was found and the frame is good enough to capture. */
  detected: boolean;
  /** All four card edges were found with a plausible ID-1 aspect ratio. */
  cardFound: boolean;
  /** 0-1, how continuous the four card edges are. */
  confidence: number;
  /** Variance of the Laplacian inside the card (or guide when no card was found). */
  sharpness: number;
  /** Fraction of blown-out pixels inside the card. */
  glare: number;
  /** Mean brightness inside the card, 0-255. */
  brightness: number;
  box: NormalizedRect | null;
  hint: IdCaptureHint;
}

export interface IdCaptureResult {
  /** JPEG cropped to the detected card. */
  card: Blob;
  /** Full JPEG frame, kept as evidence that the candidate on camera held the card. */
  frame: Blob;
  /** Data URL of `card`, for previews. */
  dataUrl: string;
  box: NormalizedRect;
  confidence: number;
  sharpness: number;
  timestamp: number;
}

/** Frames are downscaled to this width before analysis; plenty for edges and blur, and cheap. */
const ANALYSIS_WIDTH = 400;
/** Each edge is split into segments so a slightly tilted card still lines up. */
const EDGE_SEGMENTS = 8;
/** Fraction of an edge's segments that must line up for that side to count. */
const MIN_SIDE_SEGMENTS = 0.75;
/** Max tilt of a card edge relative to the guide (tan 8°). */
const MAX_EDGE_SLOPE = 0.14;
const GLARE_LEVEL = 250;

/** Centred guide the candidate lines the card up with; shared with the overlay so they match. */
export function guideRect(
  frameWidth: number,
  frameHeight: number,
  config: IdCaptureConfig
): NormalizedRect {
  const frameAspect = frameWidth / frameHeight;
  let width = config.guideWidthRatio;
  let height = (width * frameAspect) / config.aspectRatio;
  if (height > 0.85) {
    height = 0.85;
    width = (height * config.aspectRatio) / frameAspect;
  }
  return { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
}

/** Largest corner movement between two boxes, as a fraction of the frame. */
export function boxDelta(a: NormalizedRect, b: NormalizedRect) {
  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(a.x + a.width - (b.x + b.width)),
    Math.abs(a.y + a.height - (b.y + b.height))
  );
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

interface EdgeResult {
  /** Row (horizontal edge) or column (vertical edge) of the edge in analysis pixels. */
  position: number;
  /** 0-1, fraction of segments that line up weighted by their pixel coverage. */
  score: number;
  found: boolean;
}

/**
 * Detects an ID-1 card held inside the on-screen guide.
 *
 * The candidate is asked to line the card up with a fixed guide, so rather than searching the
 * whole frame for an arbitrary quadrilateral we look for four straight, continuous edges near the
 * guide's sides (Sobel gradients, split into segments to tolerate tilt), check the resulting box
 * has an ID card's aspect ratio, then grade the inside for blur, glare and exposure.
 */
export function createIdCardDetector() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Unable to create ID detection canvas');

  let gray = new Uint8ClampedArray(0);
  let gradX = new Uint16Array(0);
  let gradY = new Uint16Array(0);

  return function detect(video: HTMLVideoElement, config: IdCaptureConfig): IdCardDetection {
    const frameWidth = video.videoWidth;
    const frameHeight = video.videoHeight;
    const guide = guideRect(frameWidth, frameHeight, config);

    // Analyse the guide plus a margin so edges slightly outside it are still found.
    const marginX = guide.width * config.edgeSearchMargin;
    const marginY = guide.height * config.edgeSearchMargin;
    const sx0 = Math.max(0, guide.x - marginX);
    const sy0 = Math.max(0, guide.y - marginY);
    const sx1 = Math.min(1, guide.x + guide.width + marginX);
    const sy1 = Math.min(1, guide.y + guide.height + marginY);
    const srcW = (sx1 - sx0) * frameWidth;
    const srcH = (sy1 - sy0) * frameHeight;

    const W = Math.min(ANALYSIS_WIDTH, Math.round(srcW));
    const H = Math.round((W * srcH) / srcW);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    if (gray.length !== W * H) {
      gray = new Uint8ClampedArray(W * H);
      gradX = new Uint16Array(W * H);
      gradY = new Uint16Array(W * H);
    }

    ctx.drawImage(video, sx0 * frameWidth, sy0 * frameHeight, srcW, srcH, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);
    for (let i = 0; i < W * H; i++) {
      gray[i] = (data[i * 4] * 77 + data[i * 4 + 1] * 150 + data[i * 4 + 2] * 29) >> 8;
    }

    // Sobel gradients.
    let gradientSum = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const a = gray[i - W - 1];
        const b = gray[i - W];
        const c = gray[i - W + 1];
        const d = gray[i - 1];
        const f = gray[i + 1];
        const g = gray[i + W - 1];
        const h = gray[i + W];
        const k = gray[i + W + 1];
        gradX[i] = Math.abs(c + 2 * f + k - (a + 2 * d + g));
        gradY[i] = Math.abs(g + 2 * h + k - (a + 2 * b + c));
        gradientSum += gradX[i] + gradY[i];
      }
    }
    const meanGradient = gradientSum / (2 * (W - 2) * (H - 2));
    // Busy backgrounds raise the bar so random texture doesn't read as a card edge.
    const threshold = Math.max(config.minEdgeStrength, meanGradient * 3);

    const toX = (nx: number) => ((nx - sx0) / (sx1 - sx0)) * W;
    const toY = (ny: number) => ((ny - sy0) / (sy1 - sy0)) * H;
    const guideLeft = toX(guide.x);
    const guideRight = toX(guide.x + guide.width);
    const guideTop = toY(guide.y);
    const guideBottom = toY(guide.y + guide.height);

    /**
     * Finds a straight edge near `center` along one axis. `horizontal` edges are rows found via
     * the vertical gradient; vertical edges are columns found via the horizontal gradient.
     */
    const findEdge = (
      horizontal: boolean,
      center: number,
      band: number,
      spanStart: number,
      spanEnd: number
    ): EdgeResult => {
      const grad = horizontal ? gradY : gradX;
      const limit = horizontal ? H : W;
      const spanLimit = horizontal ? W : H;
      const at = (pos: number, along: number) =>
        horizontal ? grad[pos * W + along] : grad[along * W + pos];

      // Skip the card's rounded corners.
      const inset = (spanEnd - spanStart) * 0.1;
      const from = clamp(Math.round(spanStart + inset), 1, spanLimit - 2);
      const to = clamp(Math.round(spanEnd - inset), 1, spanLimit - 2);
      const segmentLength = (to - from + 1) / EDGE_SEGMENTS;
      const posFrom = clamp(Math.round(center - band), 2, limit - 3);
      const posTo = clamp(Math.round(center + band), 2, limit - 3);

      const segments: { position: number; coverage: number }[] = [];
      for (let s = 0; s < EDGE_SEGMENTS; s++) {
        const segFrom = Math.round(from + s * segmentLength);
        const segTo = Math.round(from + (s + 1) * segmentLength) - 1;
        let best = { position: center, coverage: 0 };
        for (let pos = posFrom; pos <= posTo; pos++) {
          let hits = 0;
          for (let along = segFrom; along <= segTo; along++) {
            // A 3px window tolerates the edge wobbling within a segment.
            const strength = Math.max(at(pos - 1, along), at(pos, along), at(pos + 1, along));
            if (strength >= threshold) hits++;
          }
          const coverage = hits / (segTo - segFrom + 1);
          if (coverage > best.coverage) best = { position: pos, coverage };
        }
        if (best.coverage >= config.minEdgeCoverage) segments.push(best);
      }

      if (segments.length === 0) return { position: center, score: 0, found: false };

      // Keep only segments that sit on the same (possibly slightly tilted) line.
      const position = median(segments.map((s) => s.position));
      const maxDeviation = Math.max(2, ((to - from) * MAX_EDGE_SLOPE) / 2);
      const aligned = segments.filter((s) => Math.abs(s.position - position) <= maxDeviation);
      const alignedFraction = aligned.length / EDGE_SEGMENTS;
      const meanCoverage = aligned.reduce((sum, s) => sum + s.coverage, 0) / (aligned.length || 1);

      return {
        position,
        score: alignedFraction * meanCoverage,
        found: alignedFraction >= MIN_SIDE_SEGMENTS,
      };
    };

    const bandX = (guideRight - guideLeft) * config.edgeSearchMargin;
    const bandY = (guideBottom - guideTop) * config.edgeSearchMargin;
    const top = findEdge(true, guideTop, bandY, guideLeft, guideRight);
    const bottom = findEdge(true, guideBottom, bandY, guideLeft, guideRight);
    const left = findEdge(false, guideLeft, bandX, guideTop, guideBottom);
    const right = findEdge(false, guideRight, bandX, guideTop, guideBottom);
    const sides = [top, bottom, left, right];
    const sidesFound = sides.filter((s) => s.found).length;

    const boxWidthPx = ((right.position - left.position) / W) * srcW;
    const boxHeightPx = ((bottom.position - top.position) / H) * srcH;
    const aspectOk =
      boxHeightPx > 0 &&
      Math.abs(boxWidthPx / boxHeightPx / config.aspectRatio - 1) <= config.aspectTolerance;
    const cardFound = sidesFound === 4 && aspectOk;

    // Grade the card interior, or the guide when no card was found (for exposure hints).
    const [rx0, ry0, rx1, ry1] = cardFound
      ? [left.position, top.position, right.position, bottom.position]
      : [guideLeft, guideTop, guideRight, guideBottom];
    const insetX = (rx1 - rx0) * 0.05;
    const insetY = (ry1 - ry0) * 0.05;
    const x0 = clamp(Math.round(rx0 + insetX), 1, W - 2);
    const x1 = clamp(Math.round(rx1 - insetX), 1, W - 2);
    const y0 = clamp(Math.round(ry0 + insetY), 1, H - 2);
    const y1 = clamp(Math.round(ry1 - insetY), 1, H - 2);

    let count = 0;
    let brightnessSum = 0;
    let glareCount = 0;
    let lapSum = 0;
    let lapSqSum = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        const v = gray[i];
        const lap = 4 * v - gray[i - 1] - gray[i + 1] - gray[i - W] - gray[i + W];
        brightnessSum += v;
        if (v >= GLARE_LEVEL) glareCount++;
        lapSum += lap;
        lapSqSum += lap * lap;
        count++;
      }
    }
    const brightness = count ? brightnessSum / count : 0;
    const glare = count ? glareCount / count : 0;
    const sharpness = count ? lapSqSum / count - (lapSum / count) ** 2 : 0;

    const confidence = cardFound ? sides.reduce((sum, s) => sum + s.score, 0) / sides.length : 0;
    const box: NormalizedRect | null = cardFound
      ? {
          x: sx0 + (left.position / W) * (sx1 - sx0),
          y: sy0 + (top.position / H) * (sy1 - sy0),
          width: ((right.position - left.position) / W) * (sx1 - sx0),
          height: ((bottom.position - top.position) / H) * (sy1 - sy0),
        }
      : null;

    let hint: IdCaptureHint;
    if (brightness < config.minBrightness) hint = 'too_dark';
    else if (!cardFound) hint = sidesFound <= 1 ? 'position' : 'align';
    else if (brightness > config.maxBrightness) hint = 'too_bright';
    else if (glare > config.maxGlareRatio) hint = 'glare';
    else if (sharpness < config.minSharpness) hint = 'blurry';
    else hint = 'hold_steady';

    return {
      detected: hint === 'hold_steady',
      cardFound,
      confidence,
      sharpness,
      glare,
      brightness,
      box,
      hint,
    };
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Unable to encode captured frame'))),
      'image/jpeg',
      quality
    );
  });
}

/** Grabs the current frame at full resolution and crops it to the detected card. */
export async function captureIdCard(
  video: HTMLVideoElement,
  detection: IdCardDetection & { box: NormalizedRect },
  config: IdCaptureConfig
): Promise<IdCaptureResult> {
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = video.videoWidth;
  frameCanvas.height = video.videoHeight;
  const frameCtx = frameCanvas.getContext('2d');
  if (!frameCtx) throw new Error('Unable to create capture canvas');
  frameCtx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);

  const { box } = detection;
  const padX = box.width * config.cropPadding;
  const padY = box.height * config.cropPadding;
  const cx0 = Math.round(clamp(box.x - padX, 0, 1) * frameCanvas.width);
  const cy0 = Math.round(clamp(box.y - padY, 0, 1) * frameCanvas.height);
  const cx1 = Math.round(clamp(box.x + box.width + padX, 0, 1) * frameCanvas.width);
  const cy1 = Math.round(clamp(box.y + box.height + padY, 0, 1) * frameCanvas.height);

  const cardCanvas = document.createElement('canvas');
  cardCanvas.width = cx1 - cx0;
  cardCanvas.height = cy1 - cy0;
  const cardCtx = cardCanvas.getContext('2d');
  if (!cardCtx) throw new Error('Unable to create capture canvas');
  cardCtx.drawImage(
    frameCanvas,
    cx0,
    cy0,
    cardCanvas.width,
    cardCanvas.height,
    0,
    0,
    cardCanvas.width,
    cardCanvas.height
  );

  const [card, frame] = await Promise.all([
    canvasToBlob(cardCanvas, config.jpegQuality),
    canvasToBlob(frameCanvas, config.jpegQuality),
  ]);

  return {
    card,
    frame,
    dataUrl: cardCanvas.toDataURL('image/jpeg', config.jpegQuality),
    box,
    confidence: detection.confidence,
    sharpness: detection.sharpness,
    timestamp: Date.now(),
  };
}
