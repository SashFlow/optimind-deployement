"use client";

import { LiveKitRoom } from "@livekit/components-react";
import type {
	GetTrialLinkOutput,
	StartPublicSessionOutput,
	StartTrialSessionInput,
} from "@repo/api/modules/sessions/public-types";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Spinner } from "@repo/ui/spinner";
import { Switch } from "@repo/ui/switch";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	releasePrefetchedCameraTrack,
	resolveLiveKitAudioOption,
	resolveLiveKitVideoOption,
} from "@/components/saas/agents/preview/livekit-prejoin-media";
import { PreviewSessionControls } from "@/components/saas/agents/preview/PreviewSessionControls";
import { PublishPrefetchedCamera } from "@/components/saas/agents/preview/PublishPrefetchedCamera";
import {
	SessionPrejoinLobby,
	type SessionPrejoinMediaSelection,
} from "@/components/saas/agents/preview/SessionPrejoinLobby";
import { ProctoringProvider } from "@/context/proctoring-provider";
import { SessionInteractionProvider } from "@/context/session-interaction-provider";
import { useSpatialRealAvatarWarmup } from "@/hooks/useSpatialRealAvatarWarmup";
import { useSpatiusHostRoom } from "@/hooks/useSpatiusHostRoom";
import type { AgentVariableDefinition } from "@/lib/agent-config";
import { normalizePhoneNumber } from "@/lib/phone";
import { resolvePreviewAvatar } from "@/lib/preview-avatar";
import { uploadFaceCaptureFiles } from "@/lib/proctoring/upload-face-capture";
import { uploadIdCaptureFiles } from "@/lib/proctoring/upload-id-capture";
import {
	DEFAULT_SESSION_MODALITIES,
	hasCameraSessionFeatures,
	isTrackMandatory,
	normalizeSessionModalities,
	resolvePreviewMedia,
} from "@/lib/session-modalities";
import { fetchTrialSpatialRealWarmup } from "@/services/api/spatialreal-warmup";

const UNAVAILABLE_MESSAGES = {
	disabled: "This shared link has been disabled.",
	expired: "This shared link has expired.",
	exhausted: "This shared link has no sessions left.",
	unpublished: "This agent is not published yet.",
} as const;

function isValidUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

/** Turn machine ids like `caller_name` into readable labels. */
function formatVariableLabel(name: string) {
	return name
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function validateVariableValues(
	variables: AgentVariableDefinition[],
	values: Record<string, string>,
): string | null {
	for (const variable of variables) {
		const value = values[variable.name]?.trim() ?? "";
		const label = formatVariableLabel(variable.name);
		if (variable.required && !value) {
			return `${label} is required`;
		}
		if (!value) {
			continue;
		}
		if (
			variable.variable_type === "number" &&
			Number.isNaN(Number(value))
		) {
			return `${label} must be a number`;
		}
		if (
			(variable.variable_type === "link" ||
				variable.variable_type === "file") &&
			!isValidUrl(value)
		) {
			return `${label} must be a valid URL`;
		}
	}
	return null;
}

function buildContactMetadata(
	variables: AgentVariableDefinition[],
	values: Record<string, string>,
): Record<string, unknown> | null {
	const validationError = validateVariableValues(variables, values);
	if (validationError) {
		toast.error(validationError);
		return null;
	}

	const contactMetadata: Record<string, unknown> = {};
	for (const variable of variables) {
		const raw = values[variable.name]?.trim();
		if (!raw) {
			continue;
		}
		contactMetadata[variable.name] =
			variable.variable_type === "number" ? Number(raw) : raw;
	}
	return contactMetadata;
}

/** Auto visitor identity for trial links — embeds link label + next session number. */
function buildTrialVisitorDetails(trial: {
	label: string;
	usageCount: number;
}) {
	const sessionNumber = trial.usageCount + 1;
	const label = trial.label.trim() || "Trial";
	const name = `${label} · Session ${sessionNumber}`.slice(0, 120);
	const labelSlug =
		label
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 40) || "trial";
	const randomSuffix = Math.random().toString(36).slice(2, 8);
	const email =
		`${labelSlug}.s${sessionNumber}.${randomSuffix}@example.com`.slice(
			0,
			254,
		);
	return { name, email };
}

function VariableField({
	variable,
	value,
	onChange,
	label,
}: {
	variable: AgentVariableDefinition;
	value: string;
	onChange: (value: string) => void;
	label: string;
}) {
	const id = `share-var-${variable.name}`;
	const placeholder = variable.required
		? `Enter ${label.toLowerCase()}`
		: "Optional";

	if (variable.variable_type === "number") {
		return (
			<Input
				id={id}
				type="number"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				className="h-11 rounded-xl sm:h-10"
			/>
		);
	}

	if (
		variable.variable_type === "link" ||
		variable.variable_type === "file"
	) {
		return (
			<Input
				id={id}
				type="url"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={
					variable.variable_type === "file"
						? "Paste file URL"
						: "https://"
				}
				className="h-11 rounded-xl sm:h-10"
			/>
		);
	}

	return (
		<Input
			id={id}
			type="text"
			value={value}
			onChange={(event) => onChange(event.target.value)}
			placeholder={placeholder}
			className="h-11 rounded-xl sm:h-10"
			autoComplete="name"
			autoCapitalize="words"
		/>
	);
}

export default function SharedTrialPage() {
	const params = useParams<{ token: string }>();
	const token = typeof params.token === "string" ? params.token : "";
	const [variableValues, setVariableValues] = useState<
		Record<string, string>
	>({});
	const [joinMedia, setJoinMedia] =
		useState<SessionPrejoinMediaSelection | null>(null);
	const [sessionMedia, setSessionMedia] = useState<"web" | "phone">("web");
	const [outboundPhone, setOutboundPhone] = useState("");
	const [phoneDispatch, setPhoneDispatch] = useState<{
		sessionId: string;
		roomName: string;
		phoneNumber: string | null;
	} | null>(null);
	const [credentials, setCredentials] = useState<{
		sessionId: string;
		token: string;
		serverUrl: string;
		spatialRealAppId: string | null;
		spatialRealSessionToken: string | null;
		spatialRealRendererToken: string | null;
		spatiusAppId: string | null;
	} | null>(null);

	const trialQuery = useQuery(
		orpc.sessions.getTrialLink.queryOptions({
			input: { token },
		}),
	) as ReturnType<typeof useQuery<GetTrialLinkOutput>>;

	const sessionModalities = normalizeSessionModalities(
		trialQuery.data?.agent.sessionModalities ?? DEFAULT_SESSION_MODALITIES,
	);
	const maxDurationSeconds =
		trialQuery.data?.agent.maxDurationSeconds ?? null;
	const audioMandatory = isTrackMandatory(sessionModalities.audio_track);
	const proctoringEnabled = sessionModalities.proctoring.enabled;
	const idVerificationEnabled = sessionModalities.proctoring.id_verification;
	const faceVerificationEnabled =
		sessionModalities.proctoring.face_verification;
	const cameraFeaturesEnabled = hasCameraSessionFeatures(
		sessionModalities.proctoring,
	);
	const videoMandatory =
		isTrackMandatory(sessionModalities.video_track) ||
		(proctoringEnabled && sessionMedia === "web");
	const chatMandatory = isTrackMandatory(sessionModalities.chat);
	const allowWeb = sessionModalities.call_type !== "phone";
	const showMediaToggle = sessionModalities.call_type === "both";

	useEffect(() => {
		setSessionMedia((current) =>
			resolvePreviewMedia(sessionModalities.call_type, current),
		);
	}, [sessionModalities.call_type]);

	const previewAvatar = resolvePreviewAvatar({
		enabled: trialQuery.data?.agent.avatarEnabled ?? false,
		provider_id: trialQuery.data?.agent.avatarProvider ?? null,
		external_avatar_id: trialQuery.data?.agent.avatarId ?? null,
	});

	useSpatialRealAvatarWarmup({
		enabled:
			!credentials &&
			!phoneDispatch &&
			Boolean(token) &&
			Boolean(trialQuery.data?.trial.available) &&
			previewAvatar.enabled &&
			previewAvatar.provider === "spatialreal" &&
			sessionMedia === "web",
		avatarId: previewAvatar.avatarId,
		fetchCredentials: token
			? () => fetchTrialSpatialRealWarmup({ token })
			: undefined,
	});

	const spatiusSessionActive =
		Boolean(credentials) &&
		previewAvatar.enabled &&
		previewAvatar.provider === "spatius";
	const spatiusHost = useSpatiusHostRoom(spatiusSessionActive);

	const startMutation = useMutation(
		orpc.sessions.startTrialSession.mutationOptions({
			onSuccess: (data: StartPublicSessionOutput) => {
				if (data.channel === "PHONE") {
					setPhoneDispatch({
						sessionId: data.sessionId,
						roomName: data.roomName,
						phoneNumber: data.phoneNumber,
					});
					toast.success(
						data.phoneNumber
							? `Calling ${data.phoneNumber}`
							: "Outbound call dispatched",
					);
					void trialQuery.refetch();
					return;
				}

				if (!data.participantToken || !data.serverUrl) {
					toast.error("Could not start web session");
					void trialQuery.refetch();
					return;
				}

				setCredentials({
					sessionId: data.sessionId,
					token: data.participantToken,
					serverUrl: data.serverUrl,
					spatialRealAppId: data.spatialRealAppId ?? null,
					spatialRealSessionToken:
						data.spatialRealSessionToken ?? null,
					spatialRealRendererToken:
						data.spatialRealRendererToken ?? null,
					spatiusAppId: data.spatiusAppId ?? null,
				});
			},
			onError: (error: Error) => {
				toast.error(error.message || "Could not start session");
				void trialQuery.refetch();
			},
		}),
	) as ReturnType<
		typeof useMutation<
			StartPublicSessionOutput,
			Error,
			StartTrialSessionInput
		>
	>;

	async function handleStart(selection: SessionPrejoinMediaSelection) {
		if (!trialQuery.data?.trial.available) {
			toast.error("This shared link is not available");
			throw new Error("Shared link unavailable");
		}

		const variables =
			(trialQuery.data?.agent.variables as AgentVariableDefinition[]) ??
			[];
		const contactMetadata = buildContactMetadata(variables, variableValues);
		if (!contactMetadata) {
			throw new Error("Invalid session variables");
		}

		if (sessionMedia === "phone") {
			const normalized = normalizePhoneNumber(outboundPhone);
			if (!normalized) {
				toast.error("Enter a valid phone number");
				throw new Error("Invalid phone number");
			}
			releasePrefetchedCameraTrack(selection);
		} else {
			setJoinMedia(selection);
		}

		const { name: visitorName, email: visitorEmail } =
			buildTrialVisitorDetails(trialQuery.data.trial);

		try {
			const data = await startMutation.mutateAsync({
				token,
				participantName: visitorName,
				contactMetadata,
				name: visitorName,
				email: visitorEmail,
				phoneNumber:
					sessionMedia === "phone"
						? (normalizePhoneNumber(outboundPhone) ?? undefined)
						: undefined,
			});
			if (
				sessionMedia !== "phone" &&
				(!data.participantToken || !data.serverUrl)
			) {
				setJoinMedia(null);
				throw new Error("Could not start web session");
			}
		} catch (error) {
			setJoinMedia(null);
			throw error;
		}
	}

	if (credentials) {
		const controls = (
			<PreviewSessionControls
				agent={{
					id: trialQuery.data?.agent.id ?? "trial",
					name: trialQuery.data?.agent.name ?? "Agent",
				}}
				avatar={previewAvatar}
				spatialRealAppId={credentials.spatialRealAppId}
				spatialRealSessionToken={credentials.spatialRealSessionToken}
				spatialRealRendererToken={credentials.spatialRealRendererToken}
				spatiusAppId={credentials.spatiusAppId}
				onSpatiusAttached={spatiusHost.markAttached}
				serverUrl={credentials.serverUrl}
				maxDurationSeconds={maxDurationSeconds}
				chatMandatory={chatMandatory}
				proctoringEnabled={proctoringEnabled}
				onEnd={() => {
					releasePrefetchedCameraTrack(joinMedia);
					setCredentials(null);
					setJoinMedia(null);
					void trialQuery.refetch();
				}}
			/>
		);
		const audio = resolveLiveKitAudioOption(joinMedia);
		const video = resolveLiveKitVideoOption(joinMedia);
		const prefetchedCamera = joinMedia?.cameraTrack;
		return (
			<div className="flex h-dvh flex-col overflow-hidden bg-black sm:h-auto sm:min-h-dvh sm:bg-background">
				<LiveKitRoom
					token={credentials.token}
					serverUrl={credentials.serverUrl}
					room={spatiusHost.room}
					connect={spatiusHost.connect}
					audio={audio}
					video={video}
					className="flex h-full min-h-0 flex-1 flex-col"
				>
					{prefetchedCamera ? (
						<PublishPrefetchedCamera
							track={prefetchedCamera}
							videoDeviceId={joinMedia?.videoDeviceId}
						/>
					) : null}
					<SessionInteractionProvider
						otpInputEnabled={sessionModalities.otp_input.enabled}
					>
						{cameraFeaturesEnabled ? (
							<ProctoringProvider
								enabled={proctoringEnabled}
								proactiveResponse={
									sessionModalities.proctoring
										.proactive_response
								}
								idVerification={idVerificationEnabled}
								faceVerification={faceVerificationEnabled}
								onIdCapture={(result) =>
									uploadIdCaptureFiles({
										sessionId: credentials.sessionId,
										participantToken: credentials.token,
										result,
									})
								}
								onFaceCapture={(result) =>
									uploadFaceCaptureFiles({
										sessionId: credentials.sessionId,
										participantToken: credentials.token,
										result,
									})
								}
							>
								{controls}
							</ProctoringProvider>
						) : (
							controls
						)}
					</SessionInteractionProvider>
				</LiveKitRoom>
			</div>
		);
	}

	if (phoneDispatch) {
		return (
			<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
				<div className="w-full space-y-4 rounded-3xl border bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
					<h1 className="font-semibold text-xl tracking-tight">
						Outbound call dispatched
					</h1>
					<p className="text-sm text-muted-foreground">
						{phoneDispatch.phoneNumber
							? `Calling ${phoneDispatch.phoneNumber}`
							: `Room ${phoneDispatch.roomName}`}
					</p>
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={() => {
							setPhoneDispatch(null);
							void trialQuery.refetch();
						}}
					>
						Done
					</Button>
				</div>
			</div>
		);
	}

	if (trialQuery.isLoading) {
		return (
			<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Spinner className="size-4" />
					Loading shared link…
				</div>
			</div>
		);
	}

	if (trialQuery.isError || !trialQuery.data) {
		return (
			<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
				<div className="w-full space-y-2 rounded-3xl border bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
					<h1 className="font-semibold text-xl tracking-tight">
						Link unavailable
					</h1>
					<p className="text-sm text-muted-foreground">
						{trialQuery.error?.message ||
							"This shared link is invalid or no longer available."}
					</p>
				</div>
			</div>
		);
	}

	const { trial, agent } = trialQuery.data;
	const variables = (agent.variables ?? []) as AgentVariableDefinition[];
	const unavailableMessage = trial.unavailableReason
		? UNAVAILABLE_MESSAGES[trial.unavailableReason]
		: null;

	if (!trial.available) {
		return (
			<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
				<div className="w-full space-y-2 rounded-3xl border bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
					<h1 className="font-semibold text-xl tracking-tight">
						{agent.name}
					</h1>
					<p className="text-sm text-muted-foreground">
						{unavailableMessage ||
							"This shared link is not available."}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-dvh w-full flex-col bg-background">
			<SessionPrejoinLobby
				title={agent.name}
				badge={`${trial.remaining} session${trial.remaining === 1 ? "" : "s"} left`}
				audioMandatory={audioMandatory}
				videoMandatory={videoMandatory}
				showWebMedia={sessionMedia === "web" && allowWeb}
				starting={startMutation.isPending}
				startLabel={
					sessionMedia === "phone" ? "Place call" : "Start session"
				}
				startingLabel={
					sessionMedia === "phone"
						? "Placing call…"
						: "Starting session…"
				}
				onStart={handleStart}
			>
				{showMediaToggle && (
					<div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
						<div className="min-w-0">
							<p className="text-sm font-medium">Phone call</p>
							<p className="text-xs text-muted-foreground">
								{sessionMedia === "phone"
									? "Place an outbound phone call"
									: "Join from this browser"}
							</p>
						</div>
						<Switch
							checked={sessionMedia === "phone"}
							onCheckedChange={(checked) =>
								setSessionMedia(checked ? "phone" : "web")
							}
							aria-label="Use phone instead of web"
						/>
					</div>
				)}

				{sessionMedia === "phone" ? (
					<div className="space-y-2">
						<Label htmlFor="share-outbound-phone">
							Phone number
						</Label>
						<Input
							id="share-outbound-phone"
							type="tel"
							value={outboundPhone}
							onChange={(event) =>
								setOutboundPhone(event.target.value)
							}
							placeholder="+91 98765 43210"
							className="h-11 rounded-xl sm:h-10"
						/>
					</div>
				) : null}

				{variables.length > 0 ? (
					<div className="space-y-3">
						<div className="grid gap-3 sm:gap-4">
							{variables.map((variable) => {
								const label = formatVariableLabel(
									variable.name,
								);
								return (
									<div
										key={variable.name}
										className="min-w-0 space-y-1.5"
									>
										<Label
											htmlFor={`share-var-${variable.name}`}
											className="block truncate text-sm font-medium"
											title={label}
										>
											{label}
											{variable.required ? (
												<span className="text-destructive">
													{" "}
													*
												</span>
											) : null}
										</Label>
										<VariableField
											variable={variable}
											label={label}
											value={
												variableValues[variable.name] ??
												""
											}
											onChange={(value) =>
												setVariableValues(
													(current) => ({
														...current,
														[variable.name]: value,
													}),
												)
											}
										/>
									</div>
								);
							})}
						</div>
					</div>
				) : null}
			</SessionPrejoinLobby>
		</div>
	);
}
