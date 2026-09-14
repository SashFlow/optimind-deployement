"use client";

import { LiveKitRoom } from "@livekit/components-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@repo/ui/accordion";
import { VoiceOrb, type VoiceOrbState } from "@repo/ui/assistant-ui";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Spinner } from "@repo/ui/spinner";
import { Switch } from "@repo/ui/switch";
import { cn } from "@repo/ui/utils";
import {
	MicIcon,
	MicOffIcon,
	PhoneIcon,
	PlayIcon,
	UploadIcon,
	VideoIcon,
	VideoOffIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApiClient } from "@/components/shared/components/ApiClientProvider";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import type { AgentVariableDefinition } from "@/lib/agent-config";
import { normalizePhoneNumber } from "@/lib/phone";
import { fetchSessionCredentials } from "@/services/api/livekit";
import { uploadPreviewAsset } from "@/services/api/preview-assets";
import type { Agent } from "@/services/api/types";
import { PreviewSessionControls } from "./preview/PreviewSessionControls";

type PreviewMedia = "web" | "phone";

async function requestMediaPermission(
	constraints: MediaStreamConstraints,
): Promise<void> {
	if (
		typeof navigator === "undefined" ||
		!navigator.mediaDevices?.getUserMedia
	) {
		throw new Error("Media devices are not available in this browser");
	}
	const stream = await navigator.mediaDevices.getUserMedia(constraints);
	for (const track of stream.getTracks()) {
		track.stop();
	}
}

type AgentConfigurePreviewProps = {
	agent: Agent;
	savedVariables: AgentVariableDefinition[];
	hasUnsavedVariables?: boolean;
	draftVersionId?: string;
	avatarEnabled?: boolean;
	avatarPreviewUrl?: string | null;
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
	avatarEnabled = false,
	avatarPreviewUrl = null,
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
	const [media, setMedia] = useState<PreviewMedia>("web");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [starting, setStarting] = useState(false);
	const [micEnabled, setMicEnabled] = useState(false);
	const [cameraEnabled, setCameraEnabled] = useState(false);
	const [mediaPermissionPending, setMediaPermissionPending] = useState<
		"mic" | "camera" | null
	>(null);
	const mediaPermissionPendingRef = useRef(false);
	const [phoneDispatch, setPhoneDispatch] = useState<{
		roomName: string;
		sessionId?: string;
	} | null>(null);
	const [sessionCredentials, setSessionCredentials] = useState<{
		token: string;
		serverUrl: string;
		contactMetadata: Record<string, unknown>;
	} | null>(null);

	const definedVariables = savedVariables.filter((v) => v.name.trim());

	async function toggleMic() {
		if (mediaPermissionPendingRef.current) {
			return;
		}
		if (micEnabled) {
			setMicEnabled(false);
			return;
		}

		mediaPermissionPendingRef.current = true;
		setMediaPermissionPending("mic");
		try {
			await requestMediaPermission({ audio: true });
			setMicEnabled(true);
		} catch (error) {
			setMicEnabled(false);
			toast.error(
				error instanceof Error
					? error.message
					: "Microphone permission denied",
			);
		} finally {
			mediaPermissionPendingRef.current = false;
			setMediaPermissionPending(null);
		}
	}

	async function toggleCamera() {
		if (mediaPermissionPendingRef.current) {
			return;
		}
		if (cameraEnabled) {
			setCameraEnabled(false);
			return;
		}

		mediaPermissionPendingRef.current = true;
		setMediaPermissionPending("camera");
		try {
			await requestMediaPermission({ video: true });
			setCameraEnabled(true);
		} catch (error) {
			setCameraEnabled(false);
			toast.error(
				error instanceof Error
					? error.message
					: "Camera permission denied",
			);
		} finally {
			mediaPermissionPendingRef.current = false;
			setMediaPermissionPending(null);
		}
	}

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
			token: credentials.participantToken,
			serverUrl: credentials.serverUrl,
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

	async function handleStartSession() {
		const contactMetadata = buildContactMetadata();
		if (!contactMetadata) {
			return;
		}

		setStarting(true);
		try {
			if (media === "phone") {
				await handleStartPhoneSession(contactMetadata);
			} else {
				await handleStartWebSession(contactMetadata);
			}
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to start session",
			);
		} finally {
			setStarting(false);
		}
	}

	function handleEndSession() {
		setSessionCredentials(null);
		setPhoneDispatch(null);
		onCancel?.();
	}

	const roomContent = useMemo(() => {
		if (!sessionCredentials) {
			return null;
		}
		return (
			<LiveKitRoom
				token={sessionCredentials.token}
				serverUrl={sessionCredentials.serverUrl}
				connect
				audio={micEnabled}
				video={cameraEnabled}
				className="flex min-h-0 flex-1 flex-col"
			>
				<PreviewSessionControls
					agent={agent}
					avatarEnabled={avatarEnabled}
					avatarPreviewUrl={avatarPreviewUrl}
					onEnd={handleEndSession}
				/>
			</LiveKitRoom>
		);
		// handleEndSession closes over onCancel; include it explicitly.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		agent,
		avatarEnabled,
		avatarPreviewUrl,
		cameraEnabled,
		micEnabled,
		onCancel,
		sessionCredentials,
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

	const showAvatar = avatarEnabled && Boolean(avatarPreviewUrl);
	const orbState: VoiceOrbState = starting ? "connecting" : "idle";

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
			<div className="flex min-h-0 flex-1 items-center justify-center bg-muted/20 p-4 sm:p-6">
				<div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-sm md:max-w-2xl md:flex-row">
					{/* Visual stage — hidden on small screens */}
					<div className="relative hidden min-h-0 shrink-0 items-center justify-center bg-muted/40 md:flex md:w-[42%] md:self-stretch">
						{showAvatar ? (
							<div className="relative aspect-3/4 w-full max-w-[200px] overflow-hidden rounded-xl border bg-muted m-5">
								{/* Dynamic avatar URL from config; next/image domains vary. */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								{/* biome-ignore lint/performance/noImgElement: dynamic avatar URLs */}
								<img
									src={avatarPreviewUrl ?? undefined}
									alt="Selected avatar"
									className="size-full object-cover"
								/>
							</div>
						) : (
							<div className="flex flex-col items-center gap-3 p-6">
								<VoiceOrb
									state={orbState}
									variant="blue"
									className="size-52"
								/>
								<p className="text-xs text-muted-foreground">
									{orbState === "connecting"
										? "Connecting…"
										: "Ready"}
								</p>
							</div>
						)}
					</div>

					{/* Controls */}
					<div className="flex min-w-0 flex-1 flex-col gap-3 p-5 sm:p-6">
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
									onChange={(e) =>
										setPhoneNumber(e.target.value)
									}
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
								<AccordionItem
									value="variables"
									className="border-b-0"
								>
									<AccordionTrigger className="py-2.5 text-sm hover:no-underline [&>svg]:ml-2">
										Variables
									</AccordionTrigger>
									<AccordionContent className="pb-3">
										<div className="space-y-3">
											<p className="text-xs text-pretty text-muted-foreground">
												Values for session variables
												used in this preview.
											</p>
											{hasUnsavedVariables ? (
												<p className="text-xs text-amber-600 dark:text-amber-500">
													Save draft to test new
													variables in preview.
												</p>
											) : null}
											<div className="max-h-48 space-y-3 overflow-y-auto pr-1">
												{definedVariables.map(
													(variable) => (
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
																	{
																		variable.variable_type
																	}
																	)
																</span>
															</Label>
															<VariableInput
																variable={
																	variable
																}
																value={
																	variableValues[
																		variable
																			.name
																	] ?? ""
																}
																onChange={(
																	value,
																) =>
																	updateVariableValue(
																		variable.name,
																		value,
																	)
																}
																onUpload={(
																	file,
																) =>
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
													),
												)}
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

						<div className="mt-auto flex flex-col gap-2 border-t pt-3">
							<div className="flex items-center gap-2">
								{media === "web" ? (
									<>
										<Button
											type="button"
											variant="outline"
											size="icon"
											aria-label={
												micEnabled
													? "Mute microphone"
													: "Unmute microphone"
											}
											aria-pressed={micEnabled}
											disabled={
												starting ||
												mediaPermissionPending !== null
											}
											className={cn(
												"size-10 shrink-0 rounded-full",
												micEnabled
													? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
													: "text-muted-foreground",
											)}
											onClick={() => void toggleMic()}
										>
											{mediaPermissionPending ===
											"mic" ? (
												<Spinner className="size-4" />
											) : micEnabled ? (
												<MicIcon className="size-4" />
											) : (
												<MicOffIcon className="size-4" />
											)}
										</Button>
										<Button
											type="button"
											variant="outline"
											size="icon"
											aria-label={
												cameraEnabled
													? "Turn camera off"
													: "Turn camera on"
											}
											aria-pressed={cameraEnabled}
											disabled={
												starting ||
												mediaPermissionPending !== null
											}
											className={cn(
												"size-10 shrink-0 rounded-full",
												cameraEnabled
													? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
													: "text-muted-foreground",
											)}
											onClick={() => void toggleCamera()}
										>
											{mediaPermissionPending ===
											"camera" ? (
												<Spinner className="size-4" />
											) : cameraEnabled ? (
												<VideoIcon className="size-4" />
											) : (
												<VideoOffIcon className="size-4" />
											)}
										</Button>
									</>
								) : null}
								<Button
									type="button"
									className="min-w-0 flex-1 gap-2"
									loading={starting}
									disabled={starting}
									onClick={() => void handleStartSession()}
								>
									{starting ? (
										<>
											<Spinner className="size-4" />
											{media === "phone"
												? "Placing call…"
												: "Starting session…"}
										</>
									) : (
										<>
											{media === "phone" ? (
												<PhoneIcon className="size-4" />
											) : (
												<PlayIcon className="size-4" />
											)}
											{media === "phone"
												? "Place call"
												: "Start session"}
										</>
									)}
								</Button>
							</div>
							{onCancel ? (
								<Button
									type="button"
									variant="outline"
									className="w-full"
									onClick={onCancel}
									disabled={starting}
								>
									Cancel
								</Button>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
