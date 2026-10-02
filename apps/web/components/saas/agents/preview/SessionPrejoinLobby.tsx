"use client";

import { Button } from "@repo/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@repo/ui/select";
import { Spinner } from "@repo/ui/spinner";
import { cn } from "@repo/ui/utils";
import {
	MicIcon,
	MicOffIcon,
	PhoneIcon,
	PlayIcon,
	VideoIcon,
	VideoOffIcon,
	Volume2Icon,
} from "lucide-react";
import {
	type ReactNode,
	type Ref,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import {
	type LocalPreviewMedia,
	useLocalPreviewMedia,
} from "./useLocalPreviewMedia";

export type SessionPrejoinMediaSelection = {
	micEnabled: boolean;
	cameraEnabled: boolean;
	audioDeviceId: string;
	videoDeviceId: string;
	audioOutputDeviceId: string;
	/**
	 * Live camera track from the prejoin preview. When present, the session
	 * should publish this track instead of calling setCameraEnabled (which
	 * would reopen the device and flash the preview).
	 */
	cameraTrack?: MediaStreamTrack | null;
};

export type SessionPrejoinLobbyHandle = {
	getMediaSelection: () => SessionPrejoinMediaSelection;
	stopPreview: () => void;
};

export type SessionPrejoinLobbyProps = {
	title: string;
	subtitle?: string | null;
	audioMandatory?: boolean;
	videoMandatory?: boolean;
	/** When false (phone mode), hide camera preview and device pills. */
	showWebMedia?: boolean;
	starting?: boolean;
	startLabel?: string;
	startingLabel?: string;
	onStart: (media: SessionPrejoinMediaSelection) => void | Promise<void>;
	onCancel?: () => void;
	cancelLabel?: string;
	children?: ReactNode;
	className?: string;
	lobbyRef?: Ref<SessionPrejoinLobbyHandle>;
};

function shortenDeviceLabel(label: string, fallback: string) {
	const cleaned = label.trim() || fallback;
	return (
		cleaned
			// Drop noisy prefixes like "Default - ".
			.replace(/^Default\s*[-–—]\s*/i, "")
			// Drop trailing hardware/id suffixes in parentheses.
			.replace(/\s*\([^)]*\)\s*$/g, "")
			.trim() || fallback
	);
}

function DevicePill({
	icon,
	value,
	placeholder,
	onValueChange,
	devices,
	disabled,
}: {
	icon: ReactNode;
	value: string;
	placeholder: string;
	onValueChange: (value: string) => void;
	devices: MediaDeviceInfo[];
	disabled?: boolean;
}) {
	const fullLabel =
		devices.find((device) => device.deviceId === value)?.label?.trim() ||
		placeholder;
	const selectedLabel = shortenDeviceLabel(fullLabel, placeholder);

	return (
		<div className="min-w-0 overflow-hidden">
			<Select
				value={value || undefined}
				onValueChange={onValueChange}
				disabled={disabled || devices.length === 0}
			>
				<SelectTrigger
					title={fullLabel}
					className="h-10 w-full min-w-0 max-w-full gap-2 overflow-hidden rounded-full border-border/70 bg-card px-3.5 text-sm shadow-none hover:bg-muted/50 data-[state=open]:bg-muted/50 [&>span]:line-clamp-none [&>span]:overflow-hidden [&>span:first-of-type]:w-auto [&>span:first-of-type]:flex-none [&>span:first-of-type]:shrink-0"
				>
					<span className="inline-flex shrink-0 items-center text-muted-foreground">
						{icon}
					</span>
					<span className="block min-w-0 flex-1 truncate text-left font-medium">
						{selectedLabel}
					</span>
				</SelectTrigger>
				<SelectContent
					align="start"
					className="w-(--radix-select-trigger-width) max-w-[min(24rem,90vw)] rounded-xl"
				>
					{devices.map((device) => (
						<SelectItem
							key={device.deviceId}
							value={device.deviceId}
						>
							<span className="line-clamp-2">
								{device.label?.trim() || placeholder}
							</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function DevicePills({
	media,
	busy,
	className,
}: {
	media: LocalPreviewMedia;
	busy: boolean;
	className?: string;
}) {
	const hasOutputs = media.outputDevices.length > 0;
	return (
		<div
			className={cn(
				"grid w-full min-w-0 grid-cols-1 gap-2",
				hasOutputs ? "sm:grid-cols-3" : "sm:grid-cols-2",
				className,
			)}
		>
			<DevicePill
				icon={<MicIcon className="size-4" strokeWidth={2} />}
				value={media.audioDeviceId}
				placeholder="Microphone"
				onValueChange={media.setAudioDeviceId}
				devices={media.audioDevices}
				disabled={busy}
			/>
			{hasOutputs ? (
				<DevicePill
					icon={<Volume2Icon className="size-4" strokeWidth={2} />}
					value={media.audioOutputDeviceId}
					placeholder="Speaker"
					onValueChange={media.setAudioOutputDeviceId}
					devices={media.outputDevices}
					disabled={busy}
				/>
			) : null}
			<DevicePill
				icon={<VideoIcon className="size-4" strokeWidth={2} />}
				value={media.videoDeviceId}
				placeholder="Camera"
				onValueChange={media.setVideoDeviceId}
				devices={media.videoDevices}
				disabled={busy}
			/>
		</div>
	);
}

function PreviewStage({
	media,
	busy,
}: {
	media: LocalPreviewMedia;
	busy: boolean;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const el = videoRef.current;
		if (!el) {
			return;
		}
		if (media.videoStream && media.cameraEnabled) {
			el.srcObject = media.videoStream;
			void el.play().catch(() => {
				// autoplay can fail if muted is cleared; keep muted
			});
		} else {
			el.srcObject = null;
		}
	}, [media.cameraEnabled, media.videoStream]);

	useEffect(() => {
		const el = videoRef.current as HTMLVideoElement & {
			setSinkId?: (id: string) => Promise<void>;
		};
		if (!el?.setSinkId || !media.audioOutputDeviceId) {
			return;
		}
		void el.setSinkId(media.audioOutputDeviceId).catch(() => {
			// Not all browsers support sink selection on video elements.
		});
	}, [media.audioOutputDeviceId]);

	return (
		<div className="relative mx-auto aspect-video w-full max-w-xl overflow-hidden rounded-2xl bg-zinc-900 shadow-sm ring-1 ring-black/10 sm:max-w-2xl lg:mx-0 lg:w-full lg:max-w-none">
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted
				className={cn(
					"size-full scale-x-[-1] object-cover rounded-2xl",
					media.cameraEnabled ? "opacity-100" : "opacity-0",
				)}
			/>
			{!media.cameraEnabled ? (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900 text-zinc-300">
					<div className="flex size-10 items-center justify-center rounded-full bg-zinc-800 sm:size-14">
						<VideoOffIcon className="size-4 sm:size-6" />
					</div>
					<p className="text-xs sm:text-sm">Camera is off</p>
				</div>
			) : null}
			<div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-2 sm:bottom-4 sm:gap-3">
				<Button
					type="button"
					size="icon"
					variant="secondary"
					aria-label={
						media.micEnabled
							? "Mute microphone"
							: "Unmute microphone"
					}
					aria-pressed={media.micEnabled}
					disabled={busy}
					className={cn(
						"size-9 rounded-full shadow-md sm:size-11",
						media.micEnabled
							? "bg-white text-zinc-900 hover:bg-white/90"
							: "bg-red-600 text-white hover:bg-red-600/90",
					)}
					onClick={() => void media.toggleMic()}
				>
					{media.permissionPending === "mic" ? (
						<Spinner className="size-4 sm:size-5" />
					) : media.micEnabled ? (
						<MicIcon className="size-4 sm:size-5" />
					) : (
						<MicOffIcon className="size-4 sm:size-5" />
					)}
				</Button>
				<Button
					type="button"
					size="icon"
					variant="secondary"
					aria-label={
						media.cameraEnabled
							? "Turn camera off"
							: "Turn camera on"
					}
					aria-pressed={media.cameraEnabled}
					disabled={busy}
					className={cn(
						"size-9 rounded-full shadow-md sm:size-11",
						media.cameraEnabled
							? "bg-white text-zinc-900 hover:bg-white/90"
							: "bg-red-600 text-white hover:bg-red-600/90",
					)}
					onClick={() => void media.toggleCamera()}
				>
					{media.permissionPending === "camera" ? (
						<Spinner className="size-4 sm:size-5" />
					) : media.cameraEnabled ? (
						<VideoIcon className="size-4 sm:size-5" />
					) : (
						<VideoOffIcon className="size-4 sm:size-5" />
					)}
				</Button>
			</div>
		</div>
	);
}

export function SessionPrejoinLobby({
	title,
	subtitle,
	audioMandatory = false,
	videoMandatory = false,
	showWebMedia = true,
	starting = false,
	startLabel = "Start session",
	startingLabel = "Starting session…",
	onStart,
	onCancel,
	cancelLabel = "Cancel",
	children,
	className,
	lobbyRef,
}: SessionPrejoinLobbyProps) {
	const media = useLocalPreviewMedia({ enabled: showWebMedia });
	const [highlightMissing, setHighlightMissing] = useState(false);

	useImperativeHandle(
		lobbyRef,
		() => ({
			getMediaSelection: () => ({
				micEnabled: media.micEnabled,
				cameraEnabled: media.cameraEnabled,
				audioDeviceId: media.audioDeviceId,
				videoDeviceId: media.videoDeviceId,
				audioOutputDeviceId: media.audioOutputDeviceId,
			}),
			stopPreview: media.stopPreview,
		}),
		[media],
	);

	const missingNotices = useMemo(() => {
		if (!showWebMedia) {
			return [] as string[];
		}
		const notices: string[] = [];
		if (audioMandatory && !media.micEnabled) {
			notices.push("Turn on microphone");
		}
		if (videoMandatory && !media.cameraEnabled) {
			notices.push("Turn on camera");
		}
		return notices;
	}, [
		audioMandatory,
		media.cameraEnabled,
		media.micEnabled,
		showWebMedia,
		videoMandatory,
	]);

	useEffect(() => {
		if (missingNotices.length === 0) {
			setHighlightMissing(false);
		}
	}, [missingNotices.length]);

	async function handleStart() {
		if (showWebMedia && missingNotices.length > 0) {
			setHighlightMissing(true);
			toast.error(missingNotices.join(" · "));
			return;
		}
		setHighlightMissing(false);
		const cameraWasEnabled = media.cameraEnabled;
		const cameraTrack = cameraWasEnabled
			? media.transferCameraTrack()
			: null;
		const selection: SessionPrejoinMediaSelection = {
			micEnabled: media.micEnabled,
			cameraEnabled: cameraWasEnabled || Boolean(cameraTrack),
			audioDeviceId: media.audioDeviceId,
			videoDeviceId: media.videoDeviceId,
			audioOutputDeviceId: media.audioOutputDeviceId,
			cameraTrack,
		};
		try {
			await onStart(selection);
		} catch {
			// Session start failed — put the camera back into the lobby preview.
			if (cameraTrack?.readyState === "live") {
				media.adoptCameraTrack(cameraTrack);
			} else if (selection.cameraEnabled) {
				void media.toggleCamera();
			}
		}
	}

	const busy = starting || media.permissionPending !== null;
	const isPhoneStart = /call/i.test(startLabel);

	return (
		<div
			className={cn(
				"flex min-h-0 w-full flex-1 flex-col bg-muted/20",
				className,
			)}
		>
			<div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-3 pb-28 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-5 sm:p-5 sm:pb-32 lg:flex-row lg:items-stretch lg:gap-8 lg:overflow-hidden lg:p-6 lg:pb-6">
				{/* Preview column */}
				<div className="flex min-w-0 shrink-0 flex-col justify-center gap-3 lg:min-h-0 lg:flex-1 lg:shrink">
					{showWebMedia ? (
						<PreviewStage media={media} busy={busy} />
					) : (
						<div className="mx-auto flex aspect-video w-full max-w-xl items-center justify-center rounded-2xl bg-muted/40 sm:max-w-2xl lg:mx-0 lg:w-full lg:max-w-none">
							<div className="flex flex-col items-center gap-2 text-muted-foreground sm:gap-3">
								<div className="flex size-10 items-center justify-center rounded-full bg-background shadow-sm sm:size-14">
									<PhoneIcon className="size-4 sm:size-6" />
								</div>
								<p className="text-xs sm:text-sm">
									Phone session
								</p>
							</div>
						</div>
					)}

					{/* Devices under preview on desktop/tablet landscape column */}
					{showWebMedia ? (
						<DevicePills
							media={media}
							busy={busy}
							className="hidden lg:grid"
						/>
					) : null}
				</div>

				{/* Details + CTA — sits right under preview on mobile so Start stays reachable */}
				<div className="flex w-full shrink-0 flex-col gap-3 sm:gap-4 lg:w-[22rem] lg:justify-center xl:w-sm">
					<div className="space-y-1 text-center">
						<h1 className="font-semibold text-xl tracking-tight text-balance sm:text-2xl">
							{title}
						</h1>
						{subtitle ? (
							<p className="text-sm text-muted-foreground">
								{subtitle}
							</p>
						) : null}
					</div>

					{children ? (
						<div className="max-h-[22vh] space-y-3 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:max-h-[28vh] lg:max-h-[50vh] lg:space-y-4">
							{children}
						</div>
					) : null}

					{showWebMedia && missingNotices.length > 0 ? (
						<p
							className={cn(
								"text-center text-xs w-full",
								highlightMissing
									? "font-medium text-destructive"
									: "text-muted-foreground",
							)}
						>
							{missingNotices.join(" · ")}
						</p>
					) : null}

					<div className="flex flex-col gap-2">
						<Button
							type="button"
							size="lg"
							className="w-full rounded-full"
							loading={starting}
							disabled={starting}
							onClick={() => void handleStart()}
						>
							{starting ? (
								<>
									<Spinner className="size-4" />
									{startingLabel}
								</>
							) : (
								<>
									{isPhoneStart ? (
										<PhoneIcon className="size-4" />
									) : (
										<PlayIcon className="size-4" />
									)}
									{startLabel}
								</>
							)}
						</Button>
						{onCancel ? (
							<Button
								type="button"
								variant="outline"
								className="w-full rounded-full"
								onClick={onCancel}
								disabled={starting}
							>
								{cancelLabel}
							</Button>
						) : null}
					</div>

					{/* Devices after CTA on mobile/tablet so primary action stays above the fold */}
					{showWebMedia ? (
						<DevicePills
							media={media}
							busy={busy}
							className="lg:hidden"
						/>
					) : null}
				</div>
			</div>
		</div>
	);
}
