"use client";

import {
	LiveKitRoom,
	useConnectionState,
	useLocalParticipant,
	VideoTrack,
	type TrackReference,
} from "@livekit/components-react";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import { cn } from "@repo/ui/utils";
import { ConnectionState, Track } from "livekit-client";
import { Loader, Shield, Video, VideoOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/saas/agents/session/confirmation-popover";
import {
	ProctoringProvider,
	useProctoringContext,
} from "@/context/proctoring-provider";
import type { BodyCaptureResult } from "@/lib/proctoring/bodyCapture";
import type { FaceCaptureResult } from "@/lib/proctoring/faceCapture";
import type { IdCaptureResult } from "@/lib/proctoring/idCard";

const DEMO_PASSWORD_STORAGE_KEY = "demo-captures-password";

const DEMO_CONFIRMATION_PROMPT = `Please review your answers below and confirm they are correct:

1. Q: Annual income, premium, and payment term. A: Customer confirmed annual income of seven lakh, premium of fifty thousand, payment term of seven years.
2. Q: Maturity period for the policy. A: Customer confirmed a maturity period of fifteen years.
3. Q: Mode of premium payment. A: Customer confirmed annual mode of premium payment.
4. Q: Nominee name and relationship. A: Customer confirmed nominee as spouse, named Priya Sharma.
5. Q: Any existing life insurance policies. A: Customer confirmed no other existing life insurance policies.
6. Q: Tobacco or nicotine use in the last twelve months. A: Customer confirmed no tobacco or nicotine use.
7. Q: Any hospitalization in the last three years. A: Customer confirmed no hospitalization in the last three years.
8. Q: Current occupation and nature of work. A: Customer confirmed occupation as software engineer, desk-based office work.
9. Q: Preferred communication language. A: Customer confirmed English as the preferred language.

I confirm that these answers are true and complete.`;

const DEMO_CONFIRMATION_ACCEPT_LABEL = "I confirm these answers are correct.";

type DemoCredentials = {
	serverUrl: string;
	roomName: string;
	participantToken: string;
};

type LastCapture = {
	type: "id" | "face" | "body";
	dataUrl: string;
	at: number;
};

function CaptureControls({
	lastCapture,
	proctoringEnabled,
	onProctoringEnabledChange,
}: {
	lastCapture: LastCapture | null;
	proctoringEnabled: boolean;
	onProctoringEnabledChange: (enabled: boolean) => void;
}) {
	const proctoring = useProctoringContext();
	const connectionState = useConnectionState();
	const { cameraTrack, isCameraEnabled, localParticipant } =
		useLocalParticipant();
	const connected = connectionState === ConnectionState.Connected;
	const busy =
		Boolean(proctoring?.isIdCaptureActive) ||
		Boolean(proctoring?.isFaceCaptureActive) ||
		Boolean(proctoring?.isBodyCaptureActive);
	const proctoringRunning =
		proctoringEnabled &&
		Boolean(proctoring?.isCameraReady) &&
		!Boolean(proctoring?.isProctoringPaused);

	const trackRef = useMemo<TrackReference | undefined>(() => {
		if (!cameraTrack || !localParticipant) {
			return undefined;
		}
		return {
			participant: localParticipant,
			publication: cameraTrack,
			source: Track.Source.Camera,
		};
	}, [cameraTrack, localParticipant]);

	useEffect(() => {
		if (!connected || isCameraEnabled) {
			return;
		}
		void localParticipant.setCameraEnabled(true).catch((error) => {
			toast.error(
				error instanceof Error
					? error.message
					: "Could not enable camera",
			);
		});
	}, [connected, isCameraEnabled, localParticipant]);

	if (!proctoring) {
		return null;
	}

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Capture playground
				</h1>
				<p className="text-muted-foreground text-sm">
					Test ID, face, body capture, confirmation UI, and continuous
					proctoring without an agent. Overlays open from the buttons
					— no verification flags or tool RPCs required.
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-3 text-sm">
				<span
					className={cn(
						"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
						connected
							? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
							: "border-amber-500/40 text-amber-700 dark:text-amber-400",
					)}
				>
					{connected ? "Connected" : "Connecting…"}
				</span>
				<span
					className={cn(
						"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
						proctoring.isCameraReady
							? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
							: "border-muted-foreground/30 text-muted-foreground",
					)}
				>
					{proctoring.isCameraReady ? (
						<Video className="size-3.5" />
					) : (
						<VideoOff className="size-3.5" />
					)}
					{proctoring.isCameraReady ? "Camera ready" : "Camera off"}
				</span>
				{proctoringEnabled ? (
					<span
						className={cn(
							"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
							proctoringRunning
								? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
								: "border-amber-500/40 text-amber-700 dark:text-amber-400",
						)}
					>
						<Shield className="size-3.5" />
						{proctoringRunning
							? "Proctoring active"
							: proctoring.isProctoringPaused
								? "Proctoring paused"
								: "Proctoring waiting"}
					</span>
				) : null}
			</div>

			<div className="flex items-start justify-between gap-4 rounded-lg border p-4">
				<div className="space-y-1">
					<Label htmlFor="demo-proctoring" className="text-sm">
						Proctoring
					</Label>
					<p className="text-muted-foreground text-xs">
						Run continuous camera checks (multiple people, devices,
						face present, gaze). Violations show as toasts; agent
						RPCs are skipped here.
					</p>
				</div>
				<Switch
					id="demo-proctoring"
					checked={proctoringEnabled}
					onCheckedChange={onProctoringEnabledChange}
					disabled={!connected}
				/>
			</div>

			<div
				className="relative w-full overflow-hidden rounded-lg border bg-black"
				style={{ aspectRatio: "16 / 9" }}
			>
				{trackRef?.publication.track && proctoring.isCameraReady ? (
					<VideoTrack
						trackRef={trackRef}
						className="absolute inset-0 size-full object-cover"
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white/80">
						<Loader className="size-4 animate-spin" />
						Waiting for camera…
					</div>
				)}
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Button
					type="button"
					disabled={!proctoring.isCameraReady || busy}
					onClick={() => proctoring.startIdCapture()}
				>
					Start ID capture
				</Button>
				<Button
					type="button"
					disabled={!proctoring.isCameraReady || busy}
					onClick={() => proctoring.startFaceCapture()}
				>
					Start face capture
				</Button>
				<Button
					type="button"
					disabled={!proctoring.isCameraReady || busy}
					onClick={() => proctoring.startBodyCapture()}
				>
					Start body capture
				</Button>
				<ConfirmationPreviewButton />
			</div>

			{!proctoring.isCameraReady ? (
				<Button
					type="button"
					variant="outline"
					onClick={() => void localParticipant.setCameraEnabled(true)}
				>
					Enable camera
				</Button>
			) : null}

			{lastCapture ? (
				<div className="space-y-2 rounded-lg border p-4">
					<p className="text-sm font-medium">
						Last capture: {lastCapture.type}{" "}
						<span className="text-muted-foreground font-normal">
							({new Date(lastCapture.at).toLocaleTimeString()})
						</span>
					</p>
					{/* biome-ignore lint/performance/noImgElement: local data URL preview */}
					<img
						src={lastCapture.dataUrl}
						alt={`Captured ${lastCapture.type}`}
						className="max-h-64 w-auto rounded-md border object-contain"
					/>
				</div>
			) : (
				<p className="text-muted-foreground text-sm">
					Captured frames stay local — nothing is uploaded and no
					agent is notified.
				</p>
			)}
		</div>
	);
}

function CaptureRoom({
	credentials,
	demoPassword,
}: {
	credentials: DemoCredentials;
	demoPassword: string;
}) {
	const [lastCapture, setLastCapture] = useState<LastCapture | null>(null);
	const [proctoringEnabled, setProctoringEnabled] = useState(false);

	const onIdCapture = useCallback(async (result: IdCaptureResult) => {
		setLastCapture({
			type: "id",
			dataUrl: result.dataUrl,
			at: result.timestamp,
		});
		return { ocr: null };
	}, []);

	const onFaceCapture = useCallback(async (result: FaceCaptureResult) => {
		setLastCapture({
			type: "face",
			dataUrl: result.dataUrl,
			at: result.timestamp,
		});
	}, []);

	const onBodyCapture = useCallback(async (result: BodyCaptureResult) => {
		setLastCapture({
			type: "body",
			dataUrl: result.dataUrl,
			at: result.timestamp,
		});
	}, []);

	return (
		<LiveKitRoom
			token={credentials.participantToken}
			serverUrl={credentials.serverUrl}
			connect
			audio={false}
			video
			className="min-h-dvh bg-background"
		>
			<ProctoringProvider
				enabled={proctoringEnabled}
				idVerification
				faceVerification
				bodyVerification
				demoCapturePassword={demoPassword}
				onIdCapture={onIdCapture}
				onFaceCapture={onFaceCapture}
				onBodyCapture={onBodyCapture}
			>
				<CaptureControls
					lastCapture={lastCapture}
					proctoringEnabled={proctoringEnabled}
					onProctoringEnabledChange={setProctoringEnabled}
				/>
			</ProctoringProvider>
		</LiveKitRoom>
	);
}

function ConfirmationPreviewButton({
	variant = "outline",
	className,
}: {
	variant?: "outline" | "default";
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const [checked, setChecked] = useState(false);

	return (
		<>
			<Button
				type="button"
				variant={variant}
				className={className}
				onClick={() => {
					setChecked(false);
					setOpen(true);
				}}
			>
				Preview confirmation
			</Button>
			{open ? (
				<ConfirmationDialog
					prompt={DEMO_CONFIRMATION_PROMPT}
					acceptLabel={DEMO_CONFIRMATION_ACCEPT_LABEL}
					checked={checked}
					onCheckedChange={setChecked}
					onAccept={() => {
						toast.success("Confirmation preview accepted");
						setOpen(false);
						setChecked(false);
					}}
					onDecline={() => {
						toast.message("Confirmation preview declined");
						setOpen(false);
						setChecked(false);
					}}
				/>
			) : null}
		</>
	);
}

export function CapturePlayground() {
	const [credentials, setCredentials] = useState<DemoCredentials | null>(
		null,
	);
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [hydrated, setHydrated] = useState(false);

	const start = useCallback(async (nextPassword: string) => {
		const trimmed = nextPassword.trim();
		if (!trimmed) {
			setError("Enter the demo password");
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const response = await fetch("/api/demo/captures-token", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: trimmed }),
			});
			if (!response.ok) {
				if (response.status === 401) {
					try {
						sessionStorage.removeItem(DEMO_PASSWORD_STORAGE_KEY);
					} catch {
						// ignore
					}
				}
				throw new Error(
					(await response.text()) || "Failed to create demo room",
				);
			}
			const data = (await response.json()) as DemoCredentials;
			try {
				sessionStorage.setItem(DEMO_PASSWORD_STORAGE_KEY, trimmed);
			} catch {
				// ignore persistence failures
			}
			setCredentials(data);
		} catch (err) {
			setCredentials(null);
			setError(
				err instanceof Error
					? err.message
					: "Failed to start capture playground",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		let stored = "";
		try {
			stored = sessionStorage.getItem(DEMO_PASSWORD_STORAGE_KEY) ?? "";
		} catch {
			// sessionStorage may be unavailable
		}
		if (stored) {
			setPassword(stored);
			void start(stored);
		}
		setHydrated(true);
	}, [start]);

	if (!hydrated || (loading && !credentials)) {
		return (
			<div className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground">
				<Loader className="size-4 animate-spin" />
				Starting capture playground…
			</div>
		);
	}

	if (!credentials) {
		return (
			<div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Capture playground
					</h1>
					<p className="text-muted-foreground text-sm">
						Enter the demo password to continue.
					</p>
				</div>
				<form
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						void start(password);
					}}
				>
					<div className="space-y-2">
						<Label htmlFor="demo-capture-password">Password</Label>
						<Input
							id="demo-capture-password"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={(event) =>
								setPassword(event.target.value)
							}
							disabled={loading}
							placeholder="Demo password"
						/>
					</div>
					{error ? (
						<p className="text-destructive text-sm">{error}</p>
					) : null}
					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? (
							<>
								<Loader className="size-4 animate-spin" />
								Unlocking…
							</>
						) : (
							"Continue"
						)}
					</Button>
					<ConfirmationPreviewButton className="w-full" />
				</form>
			</div>
		);
	}

	return (
		<CaptureRoom credentials={credentials} demoPassword={password.trim()} />
	);
}
