"use client";

import {
	type TrackReference,
	useLocalParticipant,
	useRoomContext,
	VideoTrack,
} from "@livekit/components-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { Track } from "livekit-client";
import { Loader } from "lucide-react";
import { useMemo } from "react";
import { useProctoringContext } from "@/context/proctoring-provider";
import {
	BODY_CAPTURE_HINTS,
	bodyGuideRect,
} from "@/lib/proctoring/bodyCapture";

/** Full-screen camera view with a tall body guide, shown while body capture is active. */
export function BodyCaptureOverlay() {
	const proctoring = useProctoringContext();
	const room = useRoomContext();
	const { cameraTrack } = useLocalParticipant();

	const trackRef = useMemo<TrackReference | undefined>(() => {
		if (!cameraTrack) {
			return undefined;
		}
		return {
			participant: room.localParticipant,
			publication: cameraTrack,
			source: Track.Source.Camera,
		};
	}, [cameraTrack, room.localParticipant]);

	if (!proctoring?.isBodyCaptureActive) {
		return null;
	}

	const {
		config,
		isCameraReady,
		bodyCaptureStatus,
		bodyCaptureError,
		bodyDetection,
		bodyCapture,
		startBodyCapture,
	} = proctoring;

	const width = cameraTrack?.dimensions?.width || 1280;
	const height = cameraTrack?.dimensions?.height || 720;
	const guide = bodyGuideRect(config.bodyCapture);

	const hint = bodyDetection
		? BODY_CAPTURE_HINTS[bodyDetection.hint]
		: "Starting camera…";
	const showPreview = bodyCapture && bodyCaptureStatus !== "scanning";

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="body-capture-title"
			className="bg-background/90 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		>
			<div className="bg-background border-input/50 flex w-full max-w-2xl flex-col gap-4 rounded-lg border p-4 drop-shadow-md/3">
				<div>
					<h2
						id="body-capture-title"
						className="text-lg font-semibold"
					>
						Verify your full body
					</h2>
					<p className="text-muted-foreground text-sm">
						Stand so your head and feet fit in the box. We capture
						and submit automatically once you hold still.
					</p>
				</div>

				<div
					className="relative w-full overflow-hidden rounded-md bg-black"
					style={{ aspectRatio: `${width} / ${height}` }}
				>
					{showPreview ? (
						// biome-ignore lint/performance/noImgElement: data URL from canvas capture
						<img
							src={bodyCapture.dataUrl}
							alt="Captured full body"
							className="absolute inset-0 size-full object-contain"
						/>
					) : isCameraReady && trackRef?.publication.track ? (
						<>
							<VideoTrack
								trackRef={trackRef}
								className="absolute inset-0 size-full object-cover"
							/>
							<div
								aria-hidden
								className={cn(
									"absolute rounded-lg border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-colors",
									bodyDetection?.detected
										? "border-emerald-400"
										: bodyDetection?.personFound
											? "border-amber-400"
											: "border-white/80",
								)}
								style={{
									left: `${guide.x * 100}%`,
									top: `${guide.y * 100}%`,
									width: `${guide.width * 100}%`,
									height: `${guide.height * 100}%`,
								}}
							/>
						</>
					) : (
						<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
							<p className="text-sm">
								Turn on your camera to continue.
							</p>
							<Button
								variant="secondary"
								onClick={() =>
									void room.localParticipant.setCameraEnabled(
										true,
									)
								}
							>
								Turn on camera
							</Button>
						</div>
					)}
				</div>

				<div className="flex min-h-9 items-center justify-between gap-4">
					<p
						aria-live="polite"
						className={cn(
							"flex items-center gap-2 text-sm",
							bodyCaptureStatus === "failed" &&
								"text-destructive",
						)}
					>
						{(bodyCaptureStatus === "uploading" ||
							bodyCaptureStatus === "captured") && (
							<Loader className="size-4 animate-spin" />
						)}
						{bodyCaptureStatus === "uploading"
							? "Uploading your photo…"
							: bodyCaptureStatus === "captured"
								? "Photo captured. Continuing…"
								: bodyCaptureStatus === "failed"
									? bodyCaptureError
									: isCameraReady && hint}
					</p>

					{bodyCaptureStatus === "failed" ? (
						<Button className="shrink-0" onClick={startBodyCapture}>
							Try again
						</Button>
					) : null}
				</div>
			</div>
		</div>
	);
}
