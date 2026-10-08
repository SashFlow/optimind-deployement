"use client";

import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ensureSpatiusInitialized } from "@/lib/spatius-preload";
import { loadSpatiusReplayBundle } from "@/lib/spatius-replay-assets";

type AvatarView = import("@spatius/avatarkit").AvatarView;

type Status =
	| "booting"
	| "ready"
	| "loading-assets"
	| "playing"
	| "paused"
	| "error";

export function SpatiusLocalReplayPlayer({
	appId,
	avatarId,
	clip,
	className,
}: {
	appId: string;
	avatarId: string;
	clip: string;
	className?: string;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const viewRef = useRef<AvatarView | null>(null);
	const [status, setStatus] = useState<Status>("booting");
	const [error, setError] = useState<string | null>(null);
	const [meta, setMeta] = useState<string>("");

	useEffect(() => {
		const container = containerRef.current;
		if (!container || !appId || !avatarId) {
			return;
		}

		let cancelled = false;
		let view: AvatarView | null = null;

		const boot = async () => {
			try {
				setStatus("booting");
				setError(null);
				const sdk = await ensureSpatiusInitialized(appId, {
					drivingServiceMode: "backend",
				});
				if (cancelled) {
					return;
				}

				const avatar = await sdk.AvatarManager.shared.load(avatarId);
				if (cancelled) {
					return;
				}

				await new Promise<void>((resolve, reject) => {
					const timeout = window.setTimeout(() => {
						reject(new Error("AvatarView first frame timed out"));
					}, 60_000);

					view = new sdk.AvatarView(avatar, container, {
						audioFormat: {
							channelCount: 1,
							sampleRate: 24_000,
						},
					});
					view.onFirstRendering = () => {
						window.clearTimeout(timeout);
						resolve();
					};
				});

				if (cancelled) {
					view?.dispose();
					return;
				}

				viewRef.current = view;
				setStatus("ready");
				setMeta(`${avatarId.slice(0, 8)}… / ${clip}`);
			} catch (err) {
				if (cancelled) {
					return;
				}
				const message =
					err instanceof Error ? err.message : "Failed to load avatar";
				setError(message);
				setStatus("error");
			}
		};

		void boot();

		return () => {
			cancelled = true;
			try {
				viewRef.current?.dispose();
			} catch {
				// ignore
			}
			viewRef.current = null;
		};
	}, [appId, avatarId, clip]);

	const play = useCallback(async () => {
		const view = viewRef.current;
		if (!view) {
			return;
		}

		try {
			setStatus("loading-assets");
			setError(null);
			await view.controller.initializeAudioContext();
			const { pcm, sampleRate, frames, manifest } =
				await loadSpatiusReplayBundle(avatarId, clip);

			if (sampleRate !== 24_000) {
				view.controller.setAudioFormat({ sampleRate });
			}

			const conversationId = view.controller.yieldAudioData(pcm, true);
			if (!conversationId) {
				throw new Error("yieldAudioData returned no conversationId");
			}
			view.controller.yieldFramesData(frames, conversationId);
			setMeta(
				`${manifest.frameCount} envelopes · ${manifest.durationSeconds}s · ${sampleRate} Hz`,
			);
			setStatus("playing");
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to start replay";
			setError(message);
			setStatus("error");
		}
	}, [avatarId, clip]);

	const pause = useCallback(() => {
		viewRef.current?.controller.pause();
		setStatus("paused");
	}, []);

	const resume = useCallback(async () => {
		await viewRef.current?.controller.resume();
		setStatus("playing");
	}, []);

	const restart = useCallback(async () => {
		try {
			viewRef.current?.controller.pause();
		} catch {
			// ignore
		}
		await play();
	}, [play]);

	return (
		<div className={cn("flex h-full min-h-[100dvh] flex-col bg-zinc-950", className)}>
			<div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
				<div className="min-w-0">
					<p className="truncate text-sm font-medium text-white">
						Spatius local replay
					</p>
					<p className="truncate text-xs text-white/50">
						{meta || "No Motion Server · AvatarKit backend mode"}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{(status === "ready" || status === "error") && (
						<Button size="sm" onClick={() => void play()}>
							<Play className="size-3.5" />
							Play
						</Button>
					)}
					{status === "playing" && (
						<Button size="sm" variant="secondary" onClick={pause}>
							<Pause className="size-3.5" />
							Pause
						</Button>
					)}
					{status === "paused" && (
						<Button size="sm" onClick={() => void resume()}>
							<Play className="size-3.5" />
							Resume
						</Button>
					)}
					{(status === "playing" || status === "paused") && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => void restart()}
						>
							<RotateCcw className="size-3.5" />
							Restart
						</Button>
					)}
				</div>
			</div>

			<div className="relative min-h-0 flex-1">
				<div ref={containerRef} className="absolute inset-0 bg-black" />
				{(status === "booting" || status === "loading-assets") && (
					<div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
						<div className="flex items-center gap-2 text-sm">
							<Loader2 className="size-4 animate-spin" />
							{status === "booting"
								? "Loading avatar…"
								: "Loading audio + frames…"}
						</div>
					</div>
				)}
				{status === "error" && error && (
					<div className="absolute inset-x-0 bottom-0 m-4 rounded-lg border border-red-500/40 bg-red-950/80 px-3 py-2 text-sm text-red-100">
						{error}
					</div>
				)}
			</div>
		</div>
	);
}
