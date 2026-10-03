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
import {
	FACE_CAPTURE_HINTS,
	faceGuideRect,
} from "@/lib/proctoring/faceCapture";

/** Full-screen camera view with an oval guide, shown while face capture is active. */
export function FaceCaptureOverlay() {
	const proctoring = useProctoringContext();
	const room = useRoomContext();
	const { cameraTrack } = useLocalParticipant();

	if (!proctoring?.isFaceCaptureActive) {
		return null;
	}

	const {
		config,
		isCameraReady,
		faceCaptureStatus,
		faceCaptureError,
		faceDetection,
		faceCapture,
		startFaceCapture,
		cancelFaceCapture,
	} = proctoring;

	const width = cameraTrack?.dimensions?.width || 1280;
	const height = cameraTrack?.dimensions?.height || 720;
	const guide = faceGuideRect(width, height, config.faceCapture);

	const hint = faceDetection
		? FACE_CAPTURE_HINTS[faceDetection.hint]
		: "Starting camera…";
	const showPreview = faceCapture && faceCaptureStatus !== "scanning";

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="face-capture-title"
			className="bg-background/90 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		>
			<div className="bg-background border-input/50 flex w-full max-w-2xl flex-col gap-4 rounded-lg border p-4 drop-shadow-md/3">
				<div>
					<h2
						id="face-capture-title"
						className="text-lg font-semibold"
					>
						Verify your face
					</h2>
					<p className="text-muted-foreground text-sm">
						Center your face in the oval. It is captured
						automatically once you hold still.
					</p>
				</div>

				<div
					className="relative w-full overflow-hidden rounded-md bg-black"
					style={{ aspectRatio: `${width} / ${height}` }}
				>
					{showPreview ? (
						// biome-ignore lint/performance/noImgElement: data URL from canvas capture
						<img
							src={faceCapture.dataUrl}
							alt="Captured face"
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
									"absolute rounded-[50%] border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-colors",
									faceDetection?.detected
										? "border-emerald-400"
										: faceDetection?.faceFound
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
							faceCaptureStatus === "failed" &&
								"text-destructive",
						)}
					>
						{faceCaptureStatus === "uploading" && (
							<Loader className="size-4 animate-spin" />
						)}
						{faceCaptureStatus === "uploading"
							? "Uploading your photo…"
							: faceCaptureStatus === "failed"
								? faceCaptureError
								: isCameraReady && hint}
					</p>

					<div className="flex shrink-0 gap-2">
						<Button variant="outline" onClick={cancelFaceCapture}>
							Cancel
						</Button>
						{faceCaptureStatus === "failed" && (
							<Button onClick={startFaceCapture}>
								Try again
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
