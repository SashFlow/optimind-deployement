import {
	cloneKeyframe,
	wasmParamsToKeyframe,
	type FlameKeyframe,
	type WasmFrameParams,
} from "@repo/arkit-flame";

/** SpatialReal idle clips are authored at 25 fps. */
export const IDLE_FPS = 25;
export const IDLE_SPEED_DEFAULT = 0.5;
export const IDLE_SPEED_MIN = 0.1;
export const IDLE_SPEED_MAX = 2;

/** Handle returned by AvatarCore.loadAdditionalAnimation. */
export type AnimationInfo = {
	handle: unknown;
	totalFrames: number;
};

export type AvatarCoreLike = {
	totalFrames: number | null;
	getCurrentFrameParams: (
		frameIndex?: number,
		characterId?: string,
		animationInfo?: AnimationInfo,
	) => Promise<WasmFrameParams>;
	loadAdditionalAnimation?: (
		animData: ArrayBuffer,
	) => Promise<AnimationInfo>;
};

export type IdleLoopHandle = {
	stop: () => void;
};

type StartIdleLoopOptions = {
	getCore: () => AvatarCoreLike | null;
	/**
	 * Prefer the AvatarView-private character id when known. Shape lookup falls
	 * back to the core's default handle when this doesn't match.
	 */
	characterId?: string;
	/** Required — pass the idle clip from loadAdditionalAnimation. */
	animationInfo: AnimationInfo;
	getPlaybackRate: () => number;
	renderFrame: (keyframe: FlameKeyframe) => Promise<void>;
	onError?: (error: unknown) => void;
};

function clampRate(rate: number): number {
	if (!Number.isFinite(rate)) return IDLE_SPEED_DEFAULT;
	return Math.min(IDLE_SPEED_MAX, Math.max(IDLE_SPEED_MIN, rate));
}

/**
 * Drive a baked idle.pb clip through renderFlame (pure-rendering mode).
 * Always pass `animationInfo` from `loadAdditionalAnimation` so frame reads
 * hit the correct WASM handle (AvatarView keys idle under a private id).
 */
export function startIdleLoop(options: StartIdleLoopOptions): IdleLoopHandle {
	let stopped = false;
	let raf = 0;
	let frameIndex = 0;
	let lastTick = performance.now();
	let accumMs = 0;
	let inFlight = false;
	let consecutiveErrors = 0;
	const baseIntervalMs = 1000 / IDLE_FPS;
	const total = Math.max(0, Math.floor(options.animationInfo.totalFrames));

	const tick = (now: number) => {
		if (stopped) return;
		raf = requestAnimationFrame(tick);

		const dt = Math.max(0, Math.min(100, now - lastTick));
		lastTick = now;
		if (inFlight) return;

		const rate = clampRate(options.getPlaybackRate());
		accumMs += dt * rate;

		if (accumMs < baseIntervalMs) return;
		accumMs -= baseIntervalMs;
		if (accumMs > baseIntervalMs) accumMs = 0;

		const core = options.getCore();
		if (!core || total <= 0) return;

		const index = frameIndex % total;
		frameIndex = index + 1;
		inFlight = true;

		void (async () => {
			try {
				const params = await core.getCurrentFrameParams(
					index,
					options.characterId,
					options.animationInfo,
				);
				if (stopped) return;
				consecutiveErrors = 0;
				const keyframe = wasmParamsToKeyframe(params);
				await options.renderFrame(cloneKeyframe(keyframe));
			} catch (error) {
				consecutiveErrors += 1;
				if (!stopped) options.onError?.(error);
				// Bail after repeated WASM faults instead of spamming the console.
				if (consecutiveErrors >= 5) {
					stopped = true;
					cancelAnimationFrame(raf);
				}
			} finally {
				inFlight = false;
			}
		})();
	};

	raf = requestAnimationFrame(tick);

	return {
		stop: () => {
			stopped = true;
			cancelAnimationFrame(raf);
		},
	};
}
