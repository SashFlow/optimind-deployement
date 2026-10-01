"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { Spinner } from "@repo/ui/spinner";
import { Switch } from "@repo/ui/switch";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MicIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PreviewSessionControls } from "@/components/saas/agents/preview/PreviewSessionControls";
import { ProctoringProvider } from "@/context/proctoring-provider";
import type { AgentVariableDefinition } from "@/lib/agent-config";
import { normalizePhoneNumber } from "@/lib/phone";
import { uploadIdCaptureFiles } from "@/lib/proctoring/upload-id-capture";
import { resolvePreviewAvatar } from "@/lib/preview-avatar";
import {
	DEFAULT_SESSION_MODALITIES,
	isTrackMandatory,
	normalizeSessionModalities,
	resolvePreviewMedia,
} from "@/lib/session-modalities";

const UNAVAILABLE_MESSAGES = {
	disabled: "This shared link has been disabled.",
	expired: "This shared link has expired.",
	exhausted: "This shared link has no sessions left.",
	unpublished: "This agent is not published yet.",
} as const;

const NO_CAMERA = "none";

function isValidUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

function validateVariableValues(
	variables: AgentVariableDefinition[],
	values: Record<string, string>,
): string | null {
	for (const variable of variables) {
		const value = values[variable.name]?.trim() ?? "";
		if (variable.required && !value) {
			return `${variable.name} is required`;
		}
		if (!value) {
			continue;
		}
		if (
			variable.variable_type === "number" &&
			Number.isNaN(Number(value))
		) {
			return `${variable.name} must be a number`;
		}
		if (
			(variable.variable_type === "link" ||
				variable.variable_type === "file") &&
			!isValidUrl(value)
		) {
			return `${variable.name} must be a valid URL`;
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

function VariableField({
	variable,
	value,
	onChange,
}: {
	variable: AgentVariableDefinition;
	value: string;
	onChange: (value: string) => void;
}) {
	const id = `share-var-${variable.name}`;
	const placeholder = variable.required ? "Required" : "Optional";

	if (variable.variable_type === "number") {
		return (
			<Input
				id={id}
				type="number"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
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
		/>
	);
}

export default function SharedTrialPage() {
	const params = useParams<{ token: string }>();
	const token = params.token;
	const [variableValues, setVariableValues] = useState<
		Record<string, string>
	>({});
	const [visitor, setVisitor] = useState({ name: "", email: "", phone: "" });
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [audioDeviceId, setAudioDeviceId] = useState("");
	const [videoDeviceId, setVideoDeviceId] = useState("");
	const [devicesLoading, setDevicesLoading] = useState(false);
	const [permissionError, setPermissionError] = useState<string | null>(null);
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
	} | null>(null);

	const trialQuery = useQuery(
		orpc.sessions.getTrialLink.queryOptions({
			input: { token },
		}),
	);

	const sessionModalities = normalizeSessionModalities(
		trialQuery.data?.agent.sessionModalities ?? DEFAULT_SESSION_MODALITIES,
	);
	const maxDurationSeconds =
		trialQuery.data?.agent.maxDurationSeconds ?? null;
	const audioMandatory = isTrackMandatory(sessionModalities.audio_track);
	const proctoringEnabled = sessionModalities.proctoring.enabled;
	const videoMandatory =
		isTrackMandatory(sessionModalities.video_track) ||
		(proctoringEnabled && sessionMedia === "web");
	const chatMandatory = isTrackMandatory(sessionModalities.chat);
	const allowPhone = sessionModalities.call_type !== "web";
	const allowWeb = sessionModalities.call_type !== "phone";
	const showMediaToggle = sessionModalities.call_type === "both";
	const proctoringNotice = (() => {
		if (!sessionModalities.proctoring.enabled) {
			return null;
		}
		const details: string[] = [];
		if (sessionModalities.proctoring.proactive_response) {
			details.push("proactive response");
		}
		if (sessionModalities.proctoring.id_verification) {
			details.push("ID verification");
		}
		return details.length > 0
			? `Proctoring enabled · ${details.join(" · ")}`
			: "Proctoring enabled";
	})();

	useEffect(() => {
		setSessionMedia((current) =>
			resolvePreviewMedia(sessionModalities.call_type, current),
		);
	}, [sessionModalities.call_type]);

	const startMutation = useMutation(
		orpc.sessions.startTrialSession.mutationOptions({
			onSuccess: (data) => {
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
				});
			},
			onError: (error) => {
				toast.error(error.message || "Could not start session");
				void trialQuery.refetch();
			},
		}),
	);

	const loadDevices = useCallback(async () => {
		if (
			typeof navigator === "undefined" ||
			!navigator.mediaDevices?.getUserMedia
		) {
			setPermissionError(
				"This browser does not support microphone or camera access.",
			);
			return;
		}

		setDevicesLoading(true);
		setPermissionError(null);
		try {
			if (audioMandatory) {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});
				for (const track of stream.getTracks()) {
					track.stop();
				}
			} else {
				try {
					const stream = await navigator.mediaDevices.getUserMedia({
						audio: true,
					});
					for (const track of stream.getTracks()) {
						track.stop();
					}
				} catch {
					// optional audio can continue without a mic
				}
			}

			try {
				const videoStream = await navigator.mediaDevices.getUserMedia({
					video: true,
				});
				for (const track of videoStream.getTracks()) {
					track.stop();
				}
			} catch (error) {
				if (videoMandatory) {
					throw error instanceof Error
						? error
						: new Error(
								"Camera permission is required to start a session.",
							);
				}
			}

			const devices = await navigator.mediaDevices.enumerateDevices();
			const mics = devices.filter(
				(device) => device.kind === "audioinput" && device.deviceId,
			);
			const cameras = devices.filter(
				(device) => device.kind === "videoinput" && device.deviceId,
			);
			setAudioDevices(mics);
			setVideoDevices(cameras);
			setAudioDeviceId((current) =>
				current && mics.some((device) => device.deviceId === current)
					? current
					: (mics[0]?.deviceId ?? ""),
			);
			setVideoDeviceId((current) => {
				if (
					current &&
					cameras.some((device) => device.deviceId === current)
				) {
					return current;
				}
				return videoMandatory ? (cameras[0]?.deviceId ?? "") : "";
			});
			if (audioMandatory && mics.length === 0) {
				setPermissionError(
					"No microphone found. Connect a mic and try again.",
				);
			} else if (videoMandatory && cameras.length === 0) {
				setPermissionError(
					"No camera found. Connect a camera and try again.",
				);
			}
		} catch (error) {
			setPermissionError(
				error instanceof Error
					? error.message
					: audioMandatory
						? "Microphone permission is required to start a session."
						: "Media permission is required to start a session.",
			);
			setAudioDevices([]);
			setVideoDevices([]);
			setAudioDeviceId("");
			setVideoDeviceId("");
		} finally {
			setDevicesLoading(false);
		}
	}, [audioMandatory, videoMandatory]);

	useEffect(() => {
		if (!trialQuery.data?.trial.available || !allowWeb) {
			return;
		}
		void loadDevices();
	}, [trialQuery.data?.trial.available, allowWeb, loadDevices]);

	function handleStart() {
		const variables =
			(trialQuery.data?.agent.variables as AgentVariableDefinition[]) ??
			[];
		const contactMetadata = buildContactMetadata(variables, variableValues);
		if (!contactMetadata) {
			return;
		}

		if (sessionMedia === "web") {
			if (audioMandatory && !audioDeviceId) {
				toast.error("Select a microphone before starting");
				return;
			}
			if (videoMandatory && !videoDeviceId) {
				toast.error("Select a camera before starting");
				return;
			}
		} else {
			const normalized = normalizePhoneNumber(outboundPhone);
			if (!normalized) {
				toast.error("Enter a valid phone number");
				return;
			}
		}

		const name = visitor.name.trim();
		const email = visitor.email.trim();
		const phone = visitor.phone.trim();
		startMutation.mutate({
			token,
			participantName: name || "Guest",
			contactMetadata,
			name: name || undefined,
			email: email || undefined,
			contactPhone: phone || undefined,
			phoneNumber:
				sessionMedia === "phone"
					? (normalizePhoneNumber(outboundPhone) ?? undefined)
					: undefined,
		});
	}

	if (credentials) {
		const controls = (
			<PreviewSessionControls
				agent={{
					id: trialQuery.data?.agent.id ?? "trial",
					name: trialQuery.data?.agent.name ?? "Agent",
				}}
				avatar={resolvePreviewAvatar({
					enabled: trialQuery.data?.agent.avatarEnabled ?? false,
					provider_id: trialQuery.data?.agent.avatarProvider ?? null,
					external_avatar_id: trialQuery.data?.agent.avatarId ?? null,
				})}
				spatialRealAppId={credentials.spatialRealAppId}
				maxDurationSeconds={maxDurationSeconds}
				chatMandatory={chatMandatory}
				proctoringEnabled={proctoringEnabled}
				proctoringNotice={proctoringNotice}
				onEnd={() => {
					setCredentials(null);
					void trialQuery.refetch();
				}}
			/>
		);
		return (
			<div className="flex min-h-screen flex-col bg-background">
				<LiveKitRoom
					token={credentials.token}
					serverUrl={credentials.serverUrl}
					connect
					audio={
						audioDeviceId
							? { deviceId: { exact: audioDeviceId } }
							: audioMandatory
								? true
								: false
					}
					video={
						videoDeviceId
							? { deviceId: { exact: videoDeviceId } }
							: false
					}
					className="flex min-h-screen flex-col"
				>
					{proctoringEnabled ? (
						<ProctoringProvider
							enabled
							proactiveResponse={
								sessionModalities.proctoring.proactive_response
							}
							idVerification={
								sessionModalities.proctoring.id_verification
							}
							onIdCapture={(result) =>
								uploadIdCaptureFiles({
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
	const canStartWeb =
		allowWeb &&
		!devicesLoading &&
		(!audioMandatory || Boolean(audioDeviceId)) &&
		(!videoMandatory || Boolean(videoDeviceId)) &&
		!permissionError;
	const canStartPhone =
		allowPhone && Boolean(normalizePhoneNumber(outboundPhone));
	const canStart =
		trial.available &&
		!startMutation.isPending &&
		(sessionMedia === "phone" ? canStartPhone : canStartWeb);

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-2xl items-stretch justify-center px-4 py-4 sm:items-center sm:px-6 sm:py-6">
			<div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
				<div className="shrink-0 space-y-1 border-b px-5 py-4 sm:px-6 sm:py-5">
					<h1 className="font-semibold text-xl tracking-tight sm:text-2xl">
						{agent.name}
					</h1>
					<p className="text-sm text-muted-foreground">
						Sessions left:{" "}
						<span className="font-medium text-foreground">
							{trial.remaining}
						</span>
					</p>
				</div>

				<div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
					{unavailableMessage ? (
						<div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
							{unavailableMessage}
						</div>
					) : (
						<>
							{sessionModalities.proctoring.enabled ? (
								<div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
									{proctoringNotice}
								</div>
							) : null}

							{showMediaToggle ? (
								<div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
									<div className="min-w-0">
										<p className="text-sm font-medium">
											Phone call
										</p>
										<p className="text-xs text-muted-foreground">
											{sessionMedia === "phone"
												? "Place an outbound phone call"
												: "Join from this browser"}
										</p>
									</div>
									<Switch
										checked={sessionMedia === "phone"}
										onCheckedChange={(checked) =>
											setSessionMedia(
												checked ? "phone" : "web",
											)
										}
										aria-label="Use phone instead of web"
									/>
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									{sessionMedia === "phone"
										? "This shared link starts a phone call."
										: "This shared link starts a web session."}
								</p>
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
									/>
								</div>
							) : devicesLoading ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Spinner className="size-4" />
									Requesting media access…
								</div>
							) : permissionError ? (
								<div className="space-y-3">
									<p className="text-sm text-destructive">
										{permissionError}
									</p>
									<Button
										type="button"
										variant="outline"
										className="w-full"
										onClick={() => void loadDevices()}
									>
										<MicIcon className="size-4" />
										Allow media access
									</Button>
								</div>
							) : (
								<div className="grid gap-4 sm:grid-cols-2">
									{(audioMandatory ||
										audioDevices.length > 0) && (
										<div className="min-w-0 space-y-2">
											<Label htmlFor="guest-mic">
												Microphone
												{audioMandatory ? null : (
													<span className="text-muted-foreground">
														{" "}
														(optional)
													</span>
												)}
											</Label>
											<Select
												value={
													audioDeviceId ||
													(audioMandatory
														? ""
														: NO_CAMERA)
												}
												onValueChange={(value) =>
													setAudioDeviceId(
														value === NO_CAMERA
															? ""
															: value,
													)
												}
											>
												<SelectTrigger
													id="guest-mic"
													className="w-full"
												>
													<SelectValue placeholder="Select microphone" />
												</SelectTrigger>
												<SelectContent>
													{!audioMandatory ? (
														<SelectItem
															value={NO_CAMERA}
														>
															No microphone
														</SelectItem>
													) : null}
													{audioDevices.map(
														(device) => (
															<SelectItem
																key={
																	device.deviceId
																}
																value={
																	device.deviceId
																}
															>
																{device.label ||
																	"Microphone"}
															</SelectItem>
														),
													)}
												</SelectContent>
											</Select>
										</div>
									)}

									{(videoMandatory ||
										videoDevices.length > 0) && (
										<div className="min-w-0 space-y-2">
											<Label htmlFor="guest-cam">
												Camera
												{videoMandatory ? null : (
													<span className="text-muted-foreground">
														{" "}
														(optional)
													</span>
												)}
											</Label>
											<Select
												value={
													videoDeviceId || NO_CAMERA
												}
												onValueChange={(value) =>
													setVideoDeviceId(
														value === NO_CAMERA
															? ""
															: value,
													)
												}
											>
												<SelectTrigger
													id="guest-cam"
													className="w-full"
												>
													<SelectValue
														placeholder={
															videoMandatory
																? "Select camera"
																: "No camera"
														}
													/>
												</SelectTrigger>
												<SelectContent>
													{!videoMandatory ? (
														<SelectItem
															value={NO_CAMERA}
														>
															No camera
														</SelectItem>
													) : null}
													{videoDevices.map(
														(device) => (
															<SelectItem
																key={
																	device.deviceId
																}
																value={
																	device.deviceId
																}
															>
																{device.label ||
																	"Camera"}
															</SelectItem>
														),
													)}
												</SelectContent>
											</Select>
										</div>
									)}
								</div>
							)}

							<div className="space-y-3">
								<p className="text-sm font-medium">
									Your details{" "}
									<span className="font-normal text-muted-foreground">
										(optional)
									</span>
								</p>
								<div className="grid gap-4 sm:grid-cols-3">
									{(
										[
											["name", "Name", "text", "name"],
											[
												"email",
												"Email",
												"email",
												"email",
											],
											["phone", "Phone", "tel", "tel"],
										] as const
									).map(
										([
											field,
											label,
											type,
											autoComplete,
										]) => (
											<div
												key={field}
												className="min-w-0 space-y-2"
											>
												<Label
													htmlFor={`share-visitor-${field}`}
												>
													{label}
												</Label>
												<Input
													id={`share-visitor-${field}`}
													type={type}
													autoComplete={autoComplete}
													value={visitor[field]}
													onChange={(event) =>
														setVisitor(
															(current) => ({
																...current,
																[field]:
																	event.target
																		.value,
															}),
														)
													}
												/>
											</div>
										),
									)}
								</div>
							</div>

							{variables.length > 0 ? (
								<div className="space-y-3">
									<p className="text-sm font-medium">
										Enter the following
									</p>
									<div className="grid gap-4 sm:grid-cols-2">
										{variables.map((variable) => (
											<div
												key={variable.name}
												className="min-w-0 space-y-2"
											>
												<Label
													htmlFor={`share-var-${variable.name}`}
													className="block truncate"
													title={variable.name}
												>
													{variable.name}
													{variable.required ? (
														<span className="text-destructive">
															{" "}
															*
														</span>
													) : null}
												</Label>
												<VariableField
													variable={variable}
													value={
														variableValues[
															variable.name
														] ?? ""
													}
													onChange={(value) =>
														setVariableValues(
															(current) => ({
																...current,
																[variable.name]:
																	value,
															}),
														)
													}
												/>
											</div>
										))}
									</div>
								</div>
							) : null}
						</>
					)}
				</div>

				<div className="shrink-0 border-t bg-card px-5 py-4 sm:px-6">
					<Button
						type="button"
						className="w-full"
						loading={startMutation.isPending}
						disabled={!canStart}
						onClick={handleStart}
					>
						{!trial.available
							? "Link unavailable"
							: sessionMedia === "phone"
								? "Place call"
								: "Start session"}
					</Button>
				</div>
			</div>
		</div>
	);
}
