"use client";

import { LiveKitRoom } from "@livekit/components-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@repo/ui/accordion";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import { cn } from "@repo/ui/utils";
import { PhoneIcon, UploadIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApiClient } from "@/components/shared/components/ApiClientProvider";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { ProctoringProvider } from "@/context/proctoring-provider";
import type {
	AgentVariableDefinition,
	SessionModalitiesConfig,
} from "@/lib/agent-config";
import { normalizePhoneNumber } from "@/lib/phone";
import {
	DISABLED_PREVIEW_AVATAR,
	type PreviewAvatar,
} from "@/lib/preview-avatar";
import { uploadIdCaptureFiles } from "@/lib/proctoring/upload-id-capture";
import {
	DEFAULT_SESSION_MODALITIES,
	isTrackMandatory,
	resolvePreviewMedia,
} from "@/lib/session-modalities";
import { fetchSessionCredentials } from "@/services/api/livekit";
import { uploadPreviewAsset } from "@/services/api/preview-assets";
import type { Agent } from "@/services/api/types";
import { PreviewSessionControls } from "./preview/PreviewSessionControls";
import { PublishPrefetchedCamera } from "./preview/PublishPrefetchedCamera";
import {
	releasePrefetchedCameraTrack,
	resolveLiveKitAudioOption,
	resolveLiveKitVideoOption,
} from "./preview/livekit-prejoin-media";
import {
	type SessionPrejoinMediaSelection,
	SessionPrejoinLobby,
} from "./preview/SessionPrejoinLobby";

type PreviewMedia = "web" | "phone";

type AgentConfigurePreviewProps = {
	agent: Agent;
	savedVariables: AgentVariableDefinition[];
	hasUnsavedVariables?: boolean;
	draftVersionId?: string;
	avatar?: PreviewAvatar;
	sessionModalities?: SessionModalitiesConfig;
	maxDurationSeconds?: number | null;
	onCancel?: () => void;
	className?: string;
};

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

function VariableInput({
	variable,
	value,
	onChange,
	onUpload,
	uploading,
}: {
	variable: AgentVariableDefinition;
	value: string;
	onChange: (value: string) => void;
	onUpload: (file: File) => void;
	uploading: boolean;
}) {
	const id = `preview-var-${variable.name}`;

	if (variable.variable_type === "number") {
		return (
			<Input
				id={id}
				type="number"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={variable.required ? "Required" : "Optional"}
				className="bg-background text-sm"
			/>
		);
	}

	if (variable.variable_type === "file") {
		return (
			<div className="space-y-2">
				<Input
					id={id}
					type="url"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder="Paste file URL"
					className="bg-background text-sm"
				/>
				<div className="flex items-center gap-2">
					<Label
						htmlFor={`${id}-upload`}
						className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
					>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={uploading}
							onClick={() =>
								document.getElementById(`${id}-upload`)?.click()
							}
						>
							<UploadIcon className="size-3.5" />
							{uploading ? "Uploading..." : "Upload file"}
						</Button>
					</Label>
					<input
						id={`${id}-upload`}
						type="file"
						className="hidden"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) {
								onUpload(file);
							}
							e.target.value = "";
						}}
					/>
				</div>
			</div>
		);
	}

	return (
		<Input
			id={id}
			type={variable.variable_type === "link" ? "url" : "text"}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={variable.required ? "Required" : "Optional"}
			className="bg-background text-sm"
		/>
	);
}

export function AgentConfigurePreview({
	agent,
	savedVariables,
	hasUnsavedVariables = false,
	draftVersionId,
	avatar = DISABLED_PREVIEW_AVATAR,
	sessionModalities = DEFAULT_SESSION_MODALITIES,
	maxDurationSeconds = null,
	onCancel,
	className,
}: AgentConfigurePreviewProps) {
	const api = useApiClient();
	const { activeOrganization } = useActiveOrganization();
	const activeOrganizationId = activeOrganization?.id ?? null;
	const [variableValues, setVariableValues] = useState<
		Record<string, string>
	>({});
	const [uploadingField, setUploadingField] = useState<string | null>(null);
	const [media, setMedia] = useState<PreviewMedia>(() =>
		resolvePreviewMedia(sessionModalities.call_type, "web"),
	);
	const [phoneNumber, setPhoneNumber] = useState("");
	const [starting, setStarting] = useState(false);
	const [joinMedia, setJoinMedia] =
		useState<SessionPrejoinMediaSelection | null>(null);
	const audioMandatory = isTrackMandatory(sessionModalities.audio_track);
	const proctoringEnabled = sessionModalities.proctoring.enabled;
	const videoMandatory =
		isTrackMandatory(sessionModalities.video_track) ||
		(proctoringEnabled && media === "web");
	const chatMandatory = isTrackMandatory(sessionModalities.chat);
	const [phoneDispatch, setPhoneDispatch] = useState<{
		roomName: string;
		sessionId?: string;
	} | null>(null);
	const [sessionCredentials, setSessionCredentials] = useState<{
		sessionId: string;
		token: string;
		serverUrl: string;
		spatialRealAppId: string | null;
		contactMetadata: Record<string, unknown>;
	} | null>(null);

	const definedVariables = savedVariables.filter((v) => v.name.trim());
	const allowPhone = sessionModalities.call_type !== "web";
	const allowWeb = sessionModalities.call_type !== "phone";
	const showMediaToggle = sessionModalities.call_type === "both";

	useEffect(() => {
		setMedia((current) =>
			resolvePreviewMedia(sessionModalities.call_type, current),
		);
	}, [sessionModalities.call_type]);

	function updateVariableValue(name: string, value: string) {
		setVariableValues((current) => ({ ...current, [name]: value }));
	}

	function buildContactMetadata(): Record<string, unknown> | null {
		const validationError = validateVariableValues(
			definedVariables,
			variableValues,
		);
		if (validationError) {
			toast.error(validationError);
			return null;
		}

		const contactMetadata: Record<string, unknown> = {};
		for (const variable of definedVariables) {
			const raw = variableValues[variable.name]?.trim();
			if (!raw) {
				continue;
			}
			contactMetadata[variable.name] =
				variable.variable_type === "number" ? Number(raw) : raw;
		}
		return contactMetadata;
	}

	async function handleUpload(name: string, file: File) {
		if (!activeOrganizationId) {
			return;
		}
		setUploadingField(name);
		try {
			const response = await uploadPreviewAsset(
				api,
				activeOrganizationId,
				file,
			);
			updateVariableValue(name, response.url);
			toast.success("File uploaded");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Upload failed",
			);
		} finally {
			setUploadingField(null);
		}
	}

	async function handleStartWebSession(
		contactMetadata: Record<string, unknown>,
	) {
		if (!activeOrganizationId || !draftVersionId) {
			toast.error("Save the draft before starting a preview session");
			return;
		}

		const credentials = await fetchSessionCredentials({
			api,
			organizationId: activeOrganizationId,
			agentId: agent.id,
			agentVersionId: draftVersionId,
			contactMetadata,
			metadata: { source: "configure_preview" },
			participantName: agent.name,
		});
		setSessionCredentials({
			sessionId: credentials.sessionId,
			token: credentials.participantToken,
			serverUrl: credentials.serverUrl,
			spatialRealAppId: credentials.spatialRealAppId,
			contactMetadata,
		});
	}

	async function handleStartPhoneSession(
		contactMetadata: Record<string, unknown>,
	) {
		if (!activeOrganizationId) {
			toast.error("Select an organization first");
			return;
		}

		const normalized = normalizePhoneNumber(phoneNumber);
		if (!normalized) {
			toast.error("Enter a valid phone number");
			return;
		}

		const response = await fetch("/api/outbound-call", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				organizationId: activeOrganizationId,
				agentId: agent.id,
				phoneNumber: normalized,
				selectedPersona: agent.name,
				contactMetadata,
			}),
		});
		const payload = (await response.json().catch(() => null)) as {
			error?: string;
			roomName?: string;
			sessionId?: string;
		} | null;

		if (!response.ok || !payload?.roomName) {
			throw new Error(payload?.error || "Failed to place outbound call");
		}

		setPhoneDispatch({
			roomName: payload.roomName,
			sessionId: payload.sessionId,
		});
		toast.success(`Calling ${normalized}`);
	}

	async function handleStartSession(selection: SessionPrejoinMediaSelection) {
		const contactMetadata = buildContactMetadata();
		if (!contactMetadata) {
			// Lobby restores the transferred camera track.
			throw new Error("Invalid session variables");
		}

		setStarting(true);
		try {
			if (media === "phone") {
				if (!allowPhone) {
					toast.error("Phone sessions are disabled for this agent");
					throw new Error("Phone sessions are disabled");
				}
				releasePrefetchedCameraTrack(selection);
				await handleStartPhoneSession(contactMetadata);
			} else {
				if (!allowWeb) {
					toast.error("Web sessions are disabled for this agent");
					throw new Error("Web sessions are disabled");
				}
				setJoinMedia(selection);
				await handleStartWebSession(contactMetadata);
			}
		} catch (error) {
			setJoinMedia(null);
			const message =
				error instanceof Error
					? error.message
					: "Failed to start session";
			if (
				message !== "Invalid session variables" &&
				message !== "Phone sessions are disabled" &&
				message !== "Web sessions are disabled"
			) {
				toast.error(message);
			}
			// Rethrow so the lobby can put the camera preview back.
			throw error instanceof Error ? error : new Error(message);
		} finally {
			setStarting(false);
		}
	}

	function handleEndSession() {
		releasePrefetchedCameraTrack(joinMedia);
		setSessionCredentials(null);
		setPhoneDispatch(null);
		setJoinMedia(null);
		onCancel?.();
	}

	const roomContent = useMemo(() => {
		if (!sessionCredentials) {
			return null;
		}
		const controls = (
			<PreviewSessionControls
				agent={agent}
				avatar={avatar}
				spatialRealAppId={sessionCredentials.spatialRealAppId}
				onEnd={handleEndSession}
				maxDurationSeconds={maxDurationSeconds}
				chatMandatory={chatMandatory}
				proctoringEnabled={proctoringEnabled}
			/>
		);
		const audio = resolveLiveKitAudioOption(joinMedia);
		const video = resolveLiveKitVideoOption(joinMedia);
		const prefetchedCamera = joinMedia?.cameraTrack;
		return (
			<LiveKitRoom
				token={sessionCredentials.token}
				serverUrl={sessionCredentials.serverUrl}
				connect
				audio={audio}
				video={video}
				className="flex min-h-0 flex-1 flex-col"
			>
				{prefetchedCamera ? (
					<PublishPrefetchedCamera
						track={prefetchedCamera}
						videoDeviceId={joinMedia?.videoDeviceId}
					/>
				) : null}
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
								sessionId: sessionCredentials.sessionId,
								participantToken: sessionCredentials.token,
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
		);
		// handleEndSession closes over onCancel; include it explicitly.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		agent,
		avatar,
		chatMandatory,
		joinMedia,
		maxDurationSeconds,
		onCancel,
		proctoringEnabled,
		sessionCredentials,
		sessionModalities.proctoring.id_verification,
		sessionModalities.proctoring.proactive_response,
	]);

	if (sessionCredentials) {
		return (
			<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
				<div className="flex min-h-0 flex-1 flex-col bg-muted/20">
					{roomContent}
				</div>
			</div>
		);
	}

	if (phoneDispatch) {
		return (
			<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
				<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-muted/20 p-6 text-center">
					<div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
						<PhoneIcon className="size-6" />
					</div>
					<div className="space-y-1">
						<h3 className="text-sm font-semibold">
							Outbound call dispatched
						</h3>
						<p className="text-xs text-muted-foreground">
							Room {phoneDispatch.roomName}
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						onClick={handleEndSession}
					>
						Done
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
			<SessionPrejoinLobby
				title={agent.name}
				subtitle="Preview this agent before publishing"
				audioMandatory={audioMandatory}
				videoMandatory={videoMandatory}
				showWebMedia={media === "web"}
				starting={starting}
				startLabel={media === "phone" ? "Place call" : "Start session"}
				startingLabel={
					media === "phone" ? "Placing call…" : "Starting session…"
				}
				onStart={handleStartSession}
				onCancel={onCancel}
			>
				{showMediaToggle ? (
					<div className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<Label
								htmlFor="preview-media-phone"
								className="text-sm font-medium"
							>
								Phone
							</Label>
							<p className="text-xs text-muted-foreground">
								{media === "phone"
									? "Telephony outbound call"
									: "Web browser session"}
							</p>
						</div>
						<Switch
							id="preview-media-phone"
							checked={media === "phone"}
							onCheckedChange={(checked) =>
								setMedia(checked ? "phone" : "web")
							}
							disabled={starting}
							aria-label="Use phone instead of web"
						/>
					</div>
				) : null}

				{media === "phone" ? (
					<div className="space-y-1.5">
						<Label
							htmlFor="preview-phone"
							className="text-xs text-muted-foreground"
						>
							Phone number
						</Label>
						<Input
							id="preview-phone"
							type="tel"
							value={phoneNumber}
							onChange={(e) => setPhoneNumber(e.target.value)}
							placeholder="+91 98765 43210"
							className="bg-background"
							disabled={starting}
						/>
					</div>
				) : null}

				{definedVariables.length > 0 ? (
					<Accordion
						type="multiple"
						defaultValue={[]}
						className="w-full gap-0"
					>
						<AccordionItem value="variables" className="border-b-0">
							<AccordionTrigger className="py-2.5 text-sm hover:no-underline [&>svg]:ml-2">
								Variables
							</AccordionTrigger>
							<AccordionContent className="pb-3">
								<div className="space-y-3">
									<p className="text-xs text-pretty text-muted-foreground">
										Values for session variables used in
										this preview.
									</p>
									{hasUnsavedVariables ? (
										<p className="text-xs text-amber-600 dark:text-amber-500">
											Save draft to test new variables in
											preview.
										</p>
									) : null}
									<div className="max-h-48 space-y-3 overflow-y-auto pr-1">
										{definedVariables.map((variable) => (
											<div
												key={variable.name}
												className="space-y-1.5"
											>
												<Label
													htmlFor={`preview-var-${variable.name}`}
													className="text-xs text-muted-foreground"
												>
													{variable.name}
													{variable.required ? (
														<span className="text-destructive">
															{" "}
															*
														</span>
													) : null}
													<span className="ml-1.5 font-normal">
														(
														{variable.variable_type}
														)
													</span>
												</Label>
												<VariableInput
													variable={variable}
													value={
														variableValues[
															variable.name
														] ?? ""
													}
													onChange={(value) =>
														updateVariableValue(
															variable.name,
															value,
														)
													}
													onUpload={(file) =>
														void handleUpload(
															variable.name,
															file,
														)
													}
													uploading={
														uploadingField ===
														variable.name
													}
												/>
											</div>
										))}
									</div>
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				) : hasUnsavedVariables ? (
					<p className="text-xs text-amber-600 dark:text-amber-500">
						Save draft to test new variables in preview.
					</p>
				) : null}
			</SessionPrejoinLobby>
		</div>
	);
}
