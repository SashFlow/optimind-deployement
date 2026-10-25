"use client";

import {
	arkitSpeechEnergy,
	cloneKeyframe,
	createDefaultArkitFlameProcessor,
	normalizeKeyframe,
	SILENCE_ENERGY_THRESH,
	zeroKeyframe,
	type FlameKeyframe,
} from "@repo/arkit-flame";
import { cn } from "@repo/ui/utils";
import { useEffect, useRef } from "react";
import type { ARKitLipSyncEngine } from "@/lib/arkit-lipsync/engine/ARKitLipSyncEngine";
import {
	IDLE_SPEED_DEFAULT,
	startIdleLoop,
	type AnimationInfo,
	type AvatarCoreLike,
	type IdleLoopHandle,
} from "@/lib/optimodel/idle-loop";
import {
	SpeechOverlayController,
	speechOverlayFromFlame,
} from "@/lib/optimodel/speech-overlay";
import {
	installOptiModelAssetCache,
	preloadOptiModelSdk,
	waitForOptiModelWarmupIdle,
	warmOptiModelRuntime,
} from "@/lib/gsplat-preload";
import { getOptiModelAsset } from "@/lib/stock-avatars";

const LOCAL_API = "/spatialreal-api";
const LOCAL_TOKEN = "local-offline";
const LOCAL_APP_ID = "local-offline";

type AvatarViewHandle = {
	dispose: () => void;
	onFirstRendering?: (() => void) | null;
	renderFlame: (
		keyframeData?: FlameKeyframe,
		enableIdleRendering?: boolean,
	) => Promise<void>;
	/** Internal — stop SDK idle RAF so we can own WASM frame reads. */
	stopRenderLoop?: () => void;
};

type AvatarSdkModule = {
	AvatarSDK: {
		initialize: (appId: string, config: unknown) => Promise<void>;
		setSessionToken: (token: string) => void;
		getAvatarCore?: () => AvatarCoreLike | null;
	};
	AvatarManager: {
		shared: {
			load: (
				id: string,
				onProgress: (info: {
					type: string;
					progress?: number;
					error?: Error;
				}) => void,
			) => Promise<unknown>;
		};
	};
	AvatarView: new (avatar: unknown, container: HTMLElement) => AvatarViewHandle;
	DrivingServiceMode: { backend: unknown; host?: unknown };
	LogLevel: { warning: unknown };
};

type Props = {
	engine: ARKitLipSyncEngine;
	/** Catalog id (`samira` | `sanjay`). */
	avatarId?: string | null;
	audioRef?: React.RefObject<HTMLAudioElement | null>;
	getTime?: () => number;
	driveEngine?: boolean;
	onStatus?: (msg: string) => void;
	className?: string;
};

/**
 * OptiModel stage: SpatialReal Gaussian avatar (local Spatius host mode)
 * driven by LiveKit ARKit lipsync → FLAME speech overlay.
 */
export function OptiModelViewport({
	engine,
	avatarId = "samira",
	audioRef,
	getTime,
	driveEngine = true,
	onStatus,
	className,
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const engineRef = useRef(engine);
	const audioRefProp = useRef(audioRef);
	const getTimeRef = useRef(getTime);
	const driveEngineRef = useRef(driveEngine);
	const onStatusRef = useRef(onStatus);

	engineRef.current = engine;
	audioRefProp.current = audioRef;
	getTimeRef.current = getTime;
	driveEngineRef.current = driveEngine;
	onStatusRef.current = onStatus;

	const asset = getOptiModelAsset(avatarId);
	const characterId = asset.characterId;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let cancelled = false;
		let view: AvatarViewHandle | null = null;
		let idle: IdleLoopHandle | null = null;
		let core: AvatarCoreLike | null = null;
		let raf = 0;
		let lastWall = performance.now() / 1000;
		let speaking = false;
		const overlay = new SpeechOverlayController();
		const processor = createDefaultArkitFlameProcessor();
		const viewReady = { current: false };

		const stopIdle = () => {
			idle?.stop();
			idle = null;
		};

		const renderMerged = async (idleKf: FlameKeyframe) => {
			if (!view || !viewReady.current || cancelled) return;
			try {
				await view.renderFlame(overlay.composite(idleKf), false);
			} catch (e) {
				onStatusRef.current?.(
					e instanceof Error ? e.message : String(e),
				);
			}
		};

		const startIdle = (animationInfo: AnimationInfo) => {
			stopIdle();
			if (!core) {
				onStatusRef.current?.("ready · no idle core");
				return;
			}
			idle = startIdleLoop({
				getCore: () => core,
				animationInfo,
				getPlaybackRate: () => IDLE_SPEED_DEFAULT,
				renderFrame: async (kf) => {
					await renderMerged(kf);
				},
				onError: (e) => {
					onStatusRef.current?.(
						e instanceof Error ? e.message : String(e),
					);
				},
			});
			onStatusRef.current?.("idle + speech overlay");
		};

		const driveLoop = () => {
			const now = performance.now() / 1000;
			const dt = Math.max(1e-4, Math.min(0.1, now - lastWall));
			lastWall = now;

			const eng = engineRef.current;
			if (driveEngineRef.current) {
				const external = getTimeRef.current;
				const audio = audioRefProp.current?.current;
				const playhead =
					typeof external === "function"
						? external()
						: audio
							? audio.currentTime
							: eng.getPlayhead();
				eng.update(playhead);
			}

			const weights = eng.getActiveWeights();
			const kf = processor.push(weights, dt);
			const energy = arkitSpeechEnergy(weights);
			if (energy >= SILENCE_ENERGY_THRESH) {
				speaking = true;
				overlay.setSpeech(speechOverlayFromFlame(kf));
			} else if (speaking) {
				speaking = false;
				overlay.setSpeech(null);
			}

			raf = requestAnimationFrame(driveLoop);
		};

		void (async () => {
			try {
				onStatusRef.current?.("warming OptiModel…");
				installOptiModelAssetCache();
				// Finish lobby prefetch/init if still in flight; otherwise warm now.
				await waitForOptiModelWarmupIdle();
				if (cancelled) return;
				await warmOptiModelRuntime(avatarId);
				if (cancelled) return;

				onStatusRef.current?.("initializing SDK…");
				const {
					AvatarSDK,
					AvatarManager,
					AvatarView,
					DrivingServiceMode,
					LogLevel,
				} = (await preloadOptiModelSdk()) as unknown as AvatarSdkModule;

				if (cancelled) return;

				await AvatarSDK.initialize(LOCAL_APP_ID, {
					drivingServiceMode:
						DrivingServiceMode.backend ?? DrivingServiceMode.host,
					logLevel: LogLevel.warning,
					customEndpoint: `${window.location.origin}${LOCAL_API}`,
				});
				AvatarSDK.setSessionToken(LOCAL_TOKEN);
				core = AvatarSDK.getAvatarCore?.() ?? null;

				if (cancelled) return;
				onStatusRef.current?.("attaching SpatialReal model…");

				const avatar = await AvatarManager.shared.load(
					characterId,
					(info) => {
						if (
							info.type === "downloading" &&
							typeof info.progress === "number"
						) {
							onStatusRef.current?.(
								`download ${(info.progress * 100).toFixed(0)}%`,
							);
						}
						if (info.type === "failed" && info.error) {
							onStatusRef.current?.(
								`renderer failed: ${info.error.message}`,
							);
						}
					},
				);

				if (cancelled) return;
				core = AvatarSDK.getAvatarCore?.() ?? core;

				let baseline: FlameKeyframe = zeroKeyframe();
				try {
					const frameRes = await fetch(
						`/spatialreal/${asset.dir}/idle.frame0.json`,
					);
					if (frameRes.ok) {
						baseline = normalizeKeyframe(
							(await frameRes.json()) as Partial<FlameKeyframe>,
						);
					}
				} catch {
					/* keep zeros */
				}

				container.replaceChildren();
				view = new AvatarView(avatar, container);

				await new Promise<void>((resolve, reject) => {
					const t = window.setTimeout(
						() =>
							reject(
								new Error("Timed out waiting for first frame"),
							),
						90_000,
					);
					view!.onFirstRendering = () => {
						window.clearTimeout(t);
						resolve();
					};
				});

				if (cancelled) {
					view.dispose();
					return;
				}

				core = AvatarSDK.getAvatarCore?.() ?? core;
				{
					const deadline = performance.now() + 5_000;
					let lastErr: unknown;
					while (performance.now() < deadline) {
						try {
							await view.renderFlame(
								cloneKeyframe(baseline),
								false,
							);
							lastErr = null;
							break;
						} catch (e) {
							lastErr = e;
							await new Promise((r) => window.setTimeout(r, 16));
						}
					}
					if (lastErr) throw lastErr;
				}

				if (cancelled) return;

				viewReady.current = true;

				// AvatarView starts its own idle RAF which also calls
				// getCurrentFrameParams — concurrent WASM reads cause
				// "memory access out of bounds". Take exclusive ownership.
				view.stopRenderLoop?.();

				if (!core?.loadAdditionalAnimation) {
					throw new Error("AvatarCore.loadAdditionalAnimation missing");
				}
				const idleRes = await fetch(
					`/spatialreal/${asset.dir}/idle.pb`,
				);
				if (!idleRes.ok) {
					throw new Error(
						`Failed to fetch idle.pb (${idleRes.status})`,
					);
				}
				const idleInfo = await core.loadAdditionalAnimation(
					await idleRes.arrayBuffer(),
				);
				if (cancelled) return;
				if (
					!idleInfo?.totalFrames ||
					!Number.isFinite(idleInfo.totalFrames)
				) {
					throw new Error("idle.pb reported 0 frames");
				}

				startIdle(idleInfo);
				raf = requestAnimationFrame(driveLoop);
				onStatusRef.current?.(
					`ready · idle ${idleInfo.totalFrames}f`,
				);
			} catch (e) {
				if (!cancelled) {
					const message = e instanceof Error ? e.message : String(e);
					console.error(e);
					onStatusRef.current?.(`renderer failed: ${message}`);
				}
			}
		})();

		return () => {
			cancelled = true;
			viewReady.current = false;
			overlay.reset();
			stopIdle();
			cancelAnimationFrame(raf);
			view?.dispose();
			view = null;
			core = null;
		};
	}, [asset.dir, avatarId, characterId]);

	return (
		<div className={cn("gsplat-viewport", className)}>
			<div ref={containerRef} className="gsplat-viewport-stage" />
		</div>
	);
}
