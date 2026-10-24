"use client";

import { cn } from "@repo/ui/utils";
import { useEffect, useRef, type CSSProperties } from "react";
import type { ARKitLipSyncEngine } from "@/lib/arkit-lipsync/engine/ARKitLipSyncEngine";
import { IdleFaceController } from "@/lib/arkit-lipsync/idle/IdleFaceController";
import {
	installGsplatZipCache,
	preloadGsplatRenderer,
} from "@/lib/gsplat-preload";
import { getGsplatAvatarZipUrl } from "@/lib/stock-avatars";
import { WeightBridge } from "./bridge";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export type GsplatCamera = {
	/** Distance from look-at target. */
	distance: number;
	/** Orbit yaw in degrees. */
	yawDeg: number;
	/** Orbit pitch in degrees. */
	pitchDeg: number;
	/** Look-at height offset. */
	targetY: number;
};

/**
 * Match `@myned-ai/gsplat-flame-avatar-renderer` charactorConfig after its
 * OrbitControls polar lock: camPos (0, 1.8, 1), look-at origin, white bg.
 * Same framing as avatar-pipline/web (which never overrides the camera).
 * Prefer {@link DEFAULT_GSPLAT_FRAME} zoom/crop for a tighter face view.
 */
export const DEFAULT_GSPLAT_CAMERA: GsplatCamera = {
	distance: Math.hypot(1.8, 1),
	yawDeg: 0,
	pitchDeg: 0,
	targetY: 0,
};

/** 2D display crop — zooms the canvas without moving the 3D camera. */
export type GsplatFrame = {
	/** Display zoom (≥1). */
	zoom: number;
	/** Horizontal pan as a fraction of the viewport (−0.5…0.5). */
	offsetX: number;
	/** Vertical pan (−0.5…0.5). Negative raises the face into frame. */
	offsetY: number;
};

export const DEFAULT_GSPLAT_FRAME: GsplatFrame = {
	zoom: 2.4,
	offsetX: 0,
	offsetY: 0.05,
};

export const GSPLAT_FRAME_ZOOM_MIN = 1;
export const GSPLAT_FRAME_ZOOM_MAX = 4;

type Vec3 = {
	x: number;
	y: number;
	z: number;
	set: (x: number, y: number, z: number) => void;
};

type RendererHandle = {
	dispose?: () => void;
	getCamera?: () =>
		| {
			position: Vec3;
			lookAt: (x: number, y: number, z: number) => void;
		}
		| undefined;
	viewer?: {
		controls?: {
			target: Vec3;
			update?: () => void;
			enablePan?: boolean;
			screenSpacePanning?: boolean;
			addEventListener?: (type: string, fn: () => void) => void;
			removeEventListener?: (type: string, fn: () => void) => void;
		};
		renderer?: { setClearColor?: (color: number, alpha?: number) => void };
	};
};

interface Props {
	engine: ARKitLipSyncEngine;
	/** Catalog avatar id → `/gsplat/{id}.zip` (defaults to `avatar`). */
	avatarId?: string | null;
	/** Drive engine.update when GLB viewport is not mounted (3DGS-only mode). */
	audioRef?: React.RefObject<HTMLAudioElement | null>;
	getTime?: () => number;
	/** When false, only read weights (GLB viewport owns the clock). Default true. */
	driveEngine?: boolean;
	camera?: GsplatCamera;
	/** 2D crop/zoom (does not change splat camera distance). */
	frame?: GsplatFrame;
	backgroundHex?: number;
	neckPitchDeg?: number;
	neckYawDeg?: number;
	neckRollDeg?: number;
	onStatus?: (msg: string) => void;
	/** Fired when user finishes orbit/pan/zoom (debounced). */
	onCameraChange?: (cam: GsplatCamera) => void;
	/** Fired when scroll-wheel adjusts display crop zoom. */
	onFrameChange?: (frame: GsplatFrame) => void;
	/** Lock to frontal framing for calls (no orbit/pan). */
	frontalOnly?: boolean;
	className?: string;
}

function sphericalFromCamera(
	position: { x: number; y: number; z: number },
	targetY: number,
): Pick<GsplatCamera, "distance" | "yawDeg" | "pitchDeg"> {
	const dx = position.x;
	const dy = position.y - targetY;
	const dz = position.z;
	const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
	const yawDeg = Math.atan2(dx, dz) * RAD;
	const pitchDeg = Math.asin(Math.max(-1, Math.min(1, dy / distance))) * RAD;
	return { distance, yawDeg, pitchDeg };
}

export function GsplatViewport({
	engine,
	avatarId = "avatar",
	audioRef,
	getTime,
	driveEngine = true,
	camera = DEFAULT_GSPLAT_CAMERA,
	frame = DEFAULT_GSPLAT_FRAME,
	backgroundHex,
	neckPitchDeg = 0,
	neckYawDeg = 0,
	neckRollDeg = 0,
	onStatus,
	onCameraChange,
	onFrameChange,
	frontalOnly = false,
	className,
}: Props) {
	const avatarZipUrl = getGsplatAvatarZipUrl(avatarId);
	const outerRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const engineRef = useRef(engine);
	const audioRefRef = useRef(audioRef);
	const getTimeRef = useRef(getTime);
	const driveEngineRef = useRef(driveEngine);
	const cameraRef = useRef(camera);
	const frameRef = useRef(frame);
	const frontalOnlyRef = useRef(frontalOnly);
	const bgRef = useRef(backgroundHex);
	const neckRef = useRef({
		pitch: neckPitchDeg,
		yaw: neckYawDeg,
		roll: neckRollDeg,
	});
	const onStatusRef = useRef(onStatus);
	const onCameraChangeRef = useRef(onCameraChange);
	const onFrameChangeRef = useRef(onFrameChange);
	const applyTokenRef = useRef(0);
	/** Skip one declarative apply when the prop change came from our own onCameraChange. */
	const suppressApplyRef = useRef(false);
	engineRef.current = engine;
	audioRefRef.current = audioRef;
	getTimeRef.current = getTime;
	driveEngineRef.current = driveEngine;
	cameraRef.current = frontalOnly
		? { ...camera, yawDeg: 0, pitchDeg: 0 }
		: camera;
	frameRef.current = frame;
	frontalOnlyRef.current = frontalOnly;
	bgRef.current = backgroundHex;
	neckRef.current = {
		pitch: neckPitchDeg,
		yaw: neckYawDeg,
		roll: neckRollDeg,
	};
	onStatusRef.current = onStatus;
	onCameraChangeRef.current = onCameraChange;
	onFrameChangeRef.current = onFrameChange;

	// When React camera prop changes (sliders / reset / persist), bump token to apply once.
	useEffect(() => {
		applyTokenRef.current += 1;
	}, [
		camera.distance,
		camera.yawDeg,
		camera.pitchDeg,
		camera.targetY,
		frontalOnly,
	]);

	// Scroll-wheel adjusts 2D crop zoom (keeps 3D camera / splat quality stable).
	useEffect(() => {
		const outer = outerRef.current;
		if (!outer) return;
		const onWheel = (e: WheelEvent) => {
			if (!onFrameChangeRef.current) return;
			e.preventDefault();
			const cur = frameRef.current;
			const nextZoom = Math.min(
				GSPLAT_FRAME_ZOOM_MAX,
				Math.max(
					GSPLAT_FRAME_ZOOM_MIN,
					cur.zoom * (e.deltaY > 0 ? 0.94 : 1.06),
				),
			);
			if (Math.abs(nextZoom - cur.zoom) < 1e-4) return;
			onFrameChangeRef.current({ ...cur, zoom: nextZoom });
		};
		outer.addEventListener("wheel", onWheel, { passive: false });
		return () => outer.removeEventListener("wheel", onWheel);
	}, []);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const bridge = new WeightBridge();
		const idle = new IdleFaceController();
		const t0 = performance.now();
		const now = () => (performance.now() - t0) / 1000;

		let neckPose: [number, number, number] = [0, 0, 0];
		let renderer: RendererHandle | null = null;
		let raf = 0;
		let cancelled = false;
		let rendererReady = false;
		let frames = 0;
		let fpsAt = performance.now();
		let fps = 0;
		let lastAppliedToken = -1;
		let cameraNotifyTimer = 0;

		const applyCamera = (c: GsplatCamera) => {
			const cam = renderer?.getCamera?.();
			if (!cam) return;
			const yaw = c.yawDeg * DEG;
			const pitch = c.pitchDeg * DEG;
			const x = Math.sin(yaw) * Math.cos(pitch) * c.distance;
			const y = Math.sin(pitch) * c.distance + c.targetY;
			const z = Math.cos(yaw) * Math.cos(pitch) * c.distance;
			cam.position.set(x, y, z);
			cam.lookAt(0, c.targetY, 0);
			const controls = renderer?.viewer?.controls;
			if (controls?.target) {
				controls.target.set(0, c.targetY, 0);
				controls.update?.();
			}
		};

		const readCamera = (): GsplatCamera | null => {
			const cam = renderer?.getCamera?.();
			const controls = renderer?.viewer?.controls;
			if (!cam) return null;
			const targetY = controls?.target?.y ?? cameraRef.current.targetY;
			return {
				...sphericalFromCamera(cam.position, targetY),
				targetY,
			};
		};

		const scheduleCameraEmit = () => {
			window.clearTimeout(cameraNotifyTimer);
			cameraNotifyTimer = window.setTimeout(() => {
				const next = readCamera();
				if (!next) return;
				suppressApplyRef.current = true;
				onCameraChangeRef.current?.(next);
			}, 200);
		};

		const applyBackground = () => {
			const hex = bgRef.current;
			if (hex === undefined) return;
			renderer?.viewer?.renderer?.setClearColor?.(hex, 1);
		};

		const loop = () => {
			if (cancelled) return;
			const tWall = now();
			const idleOut = idle.update(tWall);
			const manual = neckRef.current;
			neckPose = [
				(idleOut.neckPitchDeg + manual.pitch) * DEG,
				(idleOut.neckYawDeg + manual.yaw) * DEG,
				(idleOut.neckRollDeg + manual.roll) * DEG,
			];

			const eng = engineRef.current;
			if (driveEngineRef.current) {
				eng.setExpressionWeights(idleOut.weights);
				const external = getTimeRef.current;
				const audio = audioRefRef.current?.current ?? null;
				const playhead = external
					? external()
					: audio
						? audio.currentTime
						: eng.getPlayhead();
				eng.update(playhead);
			}
			bridge.push(eng.getActiveWeights(), tWall);

			if (rendererReady) {
				// Only push declarative camera when React bumped the token (slider/reset).
				// Skip the mount token so package defaults match avatar-pipline/web.
				if (applyTokenRef.current !== lastAppliedToken) {
					lastAppliedToken = applyTokenRef.current;
					if (suppressApplyRef.current) {
						suppressApplyRef.current = false;
					} else {
						applyCamera(cameraRef.current);
					}
				}
				applyBackground();
				frames++;
				const p = performance.now();
				if (p - fpsAt >= 1000) {
					fps = frames;
					frames = 0;
					fpsAt = p;
					onStatusRef.current?.(`${fps} fps`);
				}
			}
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);

		void (async () => {
			try {
				// Serve zip from lobby prefetch (memory / Cache API) when available.
				installGsplatZipCache();
				const { GaussianSplatRenderer } = await preloadGsplatRenderer();
				if (cancelled) return;
				if (!GaussianSplatRenderer) {
					throw new Error("GaussianSplatRenderer export missing");
				}

				const options: Record<string, unknown> = {
					getExpressionData: () => bridge.getExpressionData(),
					// Keep Idle so baked speak clips don't fight ARKit mouth weights.
					getChatState: () => "Idle",
					getNeckPose: () => ({ neck: neckPose }),
					loadProgress: (p: number) =>
						onStatusRef.current?.(`load ${(p * 100).toFixed(0)}%`),
					downloadProgress: (p: number) =>
						onStatusRef.current?.(
							`download ${(p * 100).toFixed(0)}%`,
						),
				};
				// Omit backgroundColor unless set — package default is white (same as harness).
				if (bgRef.current !== undefined) {
					options.backgroundColor = `0x${bgRef.current.toString(16).padStart(6, "0")}`;
				}

				// Prefer create when present (1.4.0 getInstance delegates to create).
				const Renderer = GaussianSplatRenderer as typeof GaussianSplatRenderer & {
					create?: (
						el: HTMLDivElement,
						url: string,
						options: Record<string, unknown>,
					) => Promise<RendererHandle>;
				};
				renderer = Renderer.create
					? await Renderer.create(container, avatarZipUrl, options)
					: await Renderer.getInstance(container, avatarZipUrl, options);
				if (cancelled) {
					renderer.dispose?.();
					return;
				}

				const controls = renderer.viewer?.controls;
				if (controls) {
					const lock = frontalOnlyRef.current;
					if ("enablePan" in controls) controls.enablePan = !lock;
					if ("enableRotate" in controls) {
						(controls as { enableRotate?: boolean }).enableRotate =
							!lock;
					}
					if ("screenSpacePanning" in controls)
						controls.screenSpacePanning = true;
					if (!lock) {
						controls.addEventListener?.("end", scheduleCameraEmit);
						controls.addEventListener?.(
							"change",
							scheduleCameraEmit,
						);
					}
				}

				rendererReady = true;
				// Adopt package camera on first paint (do not overwrite with React defaults).
				lastAppliedToken = applyTokenRef.current;
				applyBackground();
				onStatusRef.current?.("renderer ready");
			} catch (e) {
				const message = e instanceof Error ? e.message : String(e);
				console.error(e);
				onStatusRef.current?.(`renderer failed: ${message}`);
			}
		})();

		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
			window.clearTimeout(cameraNotifyTimer);
			const controls = renderer?.viewer?.controls;
			controls?.removeEventListener?.("end", scheduleCameraEmit);
			controls?.removeEventListener?.("change", scheduleCameraEmit);
			renderer?.dispose?.();
			renderer = null;
			container.replaceChildren();
		};
	}, [avatarZipUrl]);

	return (
		<div
			ref={outerRef}
			className={cn("gsplat-viewport", className)}
			style={
				{
					"--gsplat-zoom": String(frame.zoom),
					"--gsplat-ox": `${frame.offsetX * 100}%`,
					"--gsplat-oy": `${frame.offsetY * 100}%`,
				} as CSSProperties
			}
		>
			<div ref={containerRef} className="gsplat-viewport-stage" />
		</div>
	);
}
