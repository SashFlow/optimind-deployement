"use client";

import {
	useLocalParticipant,
	useRoomContext,
	VideoTrack,
} from "@livekit/components-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { Track } from "livekit-client";
import { Loader } from "lucide-react";
import { useProctoringContext } from "@/context/proctoring-provider";
import { guideRect, ID_CAPTURE_HINTS } from "@/lib/proctoring/idCard";

/** Full-screen camera view with a card-shaped guide, shown while ID capture is active. */
export function IdCaptureOverlay() {
	const proctoring = useProctoringContext();
	const room = useRoomContext();
	const { cameraTrack } = useLocalParticipant();

	if (!proctoring?.isIdCaptureActive) return null;

	const {
		config,
		isCameraReady,
		idCaptureStatus,
		idCaptureError,
		idDetection,
		idCapture,
		startIdCapture,
		cancelIdCapture,
	} = proctoring;

	const width = cameraTrack?.dimensions?.width || 1280;
	const height = cameraTrack?.dimensions?.height || 720;
	// Centred and symmetric, so it lines up whether or not the preview is mirrored.
	const guide = guideRect(width, height, config.idCapture);

	const hint = idDetection
		? ID_CAPTURE_HINTS[idDetection.hint]
		: "Starting camera…";
	const showPreview = idCapture && idCaptureStatus !== "scanning";

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="id-capture-title"
			className="bg-background/90 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		>
			<div className="bg-background border-input/50 flex w-full max-w-2xl flex-col gap-4 rounded-lg border p-4 drop-shadow-md/3">
				<div>
					<h2 id="id-capture-title" className="text-lg font-semibold">
						Verify your ID
					</h2>
					<p className="text-muted-foreground text-sm">
						Hold the front of your government-issued ID up to the
						camera. It is captured automatically once it is in
						focus.
					</p>
				</div>

				<div
					className="relative w-full overflow-hidden rounded-md bg-black"
					style={{ aspectRatio: `${width} / ${height}` }}
				>
					{showPreview ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={idCapture.dataUrl}
							alt="Captured ID card"
							className="absolute inset-0 size-full object-contain"
						/>
					) : isCameraReady && cameraTrack?.track ? (
						<>
							<VideoTrack
								trackRef={{
									participant: room.localParticipant,
									publication: cameraTrack,
									source: Track.Source.Camera,
								}}
								className="absolute inset-0 size-full object-cover"
							/>
							<div
								aria-hidden
								className={cn(
									"absolute rounded-[4%] border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-colors",
									idDetection?.detected
										? "border-emerald-400"
										: idDetection?.cardFound
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
							idCaptureStatus === "failed" && "text-destructive",
						)}
					>
						{idCaptureStatus === "uploading" && (
							<Loader className="size-4 animate-spin" />
						)}
						{idCaptureStatus === "uploading"
							? "Uploading your ID…"
							: idCaptureStatus === "failed"
								? idCaptureError
								: isCameraReady && hint}
					</p>

					<div className="flex shrink-0 gap-2">
						<Button variant="outline" onClick={cancelIdCapture}>
							Cancel
						</Button>
						{idCaptureStatus === "failed" && (
							<Button onClick={startIdCapture}>Try again</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
