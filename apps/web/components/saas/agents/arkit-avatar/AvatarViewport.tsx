"use client";

import { GaussianSplatRenderer } from "@myned-ai/gsplat-flame-avatar-renderer";
import { useEffect, useRef } from "react";
import type { ARKitLipSyncEngine } from "@/lib/arkit-lipsync/engine/ARKitLipSyncEngine";
import { IdleFaceController } from "@/lib/arkit-lipsync/idle/IdleFaceController";
import { WeightBridge } from "./weightBridge";

interface Props {
	engine: ARKitLipSyncEngine;
	audioRef: React.RefObject<HTMLAudioElement | null>;
	/** Static ZIP URL for the LAM / FLAME Gaussian-splat avatar. */
	zipUrl: string;
	/**
	 * Optional external playback clock (e.g. WebAudioClock for LiveKit MediaStream).
	 * When set, overrides HTMLAudioElement.currentTime.
	 */
	getTime?: () => number;
	/** Animation state machine input for the splat renderer. */
	getChatState?: () => string;
	onReady?: () => void;
	className?: string;
}

const DEG = Math.PI / 180;
const BG = "0xffffff";

/** Face-fill framing for the FLAME / LAM head (renderer default is too wide). */
const FACE_TARGET: [number, number, number] = [0, 1.52, 0];
const FACE_CAMERA: [number, number, number] = [0, 1.55, 0.42];

function frameFaceClose(instance: GaussianSplatRenderer, mount: HTMLElement) {
	const camera = instance.getCamera();
	const viewer = instance.viewer as {
		controls?: {
			target: { set: (x: number, y: number, z: number) => void };
			minDistance: number;
			maxDistance: number;
			update: () => void;
		};
	} | null;

	if (camera) {
		camera.position.set(...FACE_CAMERA);
		if (viewer?.controls) {
			viewer.controls.target.set(...FACE_TARGET);
			viewer.controls.minDistance = 0.28;
			viewer.controls.maxDistance = 1.1;
			viewer.controls.update();
		} else {
			camera.lookAt(...FACE_TARGET);
		}
	}

	const canvas = mount.querySelector("canvas");
	if (canvas) {
		canvas.style.width = "100%";
		canvas.style.height = "100%";
		canvas.style.display = "block";
		canvas.style.objectFit = "cover";
	}
}

export function AvatarViewport({
	engine,
	audioRef,
	zipUrl,
	getTime,
	getChatState,
	onReady,
	className,
}: Props) {
	const mountRef = useRef<HTMLDivElement>(null);
	const getTimeRef = useRef(getTime);
	const getChatStateRef = useRef(getChatState);
	const onReadyRef = useRef(onReady);
	getTimeRef.current = getTime;
	getChatStateRef.current = getChatState;
	onReadyRef.current = onReady;

	useEffect(() => {
		const mount = mountRef.current;
		if (!mount) {
			return;
		}

		const bridge = new WeightBridge();
		const idle = new IdleFaceController();
		let neck: [number, number, number] = [0, 0, 0];
		let disposed = false;
		let renderer: GaussianSplatRenderer | null = null;
		let raf = 0;
		const t0 = performance.now();

		const tick = () => {
			raf = requestAnimationFrame(tick);
			const now = (performance.now() - t0) / 1000;
			const idleOut = idle.update(now);
			neck = [
				idleOut.neckPitchDeg * DEG,
				idleOut.neckYawDeg * DEG,
				idleOut.neckRollDeg * DEG,
			];
			engine.setExpressionWeights(idleOut.weights);
			const external = getTimeRef.current;
			const audio = audioRef.current;
			const t = external
				? external()
				: audio
					? audio.currentTime
					: engine.getPlayhead();
			engine.update(t);
			bridge.push(engine.getActiveWeights(), now);
		};
		tick();

		void GaussianSplatRenderer.getInstance(mount, zipUrl, {
			backgroundColor: BG,
			getExpressionData: () => bridge.getExpressionData(),
			getChatState: () => getChatStateRef.current?.() ?? "Idle",
			getNeckPose: () => ({ neck }),
		})
			.then((instance) => {
				if (disposed) {
					instance.dispose();
					return;
				}
				renderer = instance;
				frameFaceClose(instance, mount);
				onReadyRef.current?.();
			})
			.catch((err) => {
				console.error("Failed to load 3DGS avatar", err);
			});

		return () => {
			disposed = true;
			cancelAnimationFrame(raf);
			renderer?.dispose();
			renderer = null;
		};
	}, [engine, audioRef, zipUrl]);

	return (
		<div
			className={className}
			ref={mountRef}
			style={{ width: "100%", height: "100%", minHeight: 0 }}
		/>
	);
}
