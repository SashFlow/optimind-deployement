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
import { cn } from "@repo/ui/utils";
import {
	CameraIcon,
	MicIcon,
	PhoneIcon,
	PlayIcon,
	UploadIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { InlineSkeleton } from "@/components/saas/shared/skeletons";
import { useApiClient } from "@/components/shared/components/ApiClientProvider";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import type { AgentVariableDefinition } from "@/lib/agent-config";
import { normalizePhoneNumber } from "@/lib/phone";
import { fetchSessionCredentials } from "@/services/api/livekit";
import { uploadPreviewAsset } from "@/services/api/preview-assets";
import type { Agent } from "@/services/api/types";
import { PreviewSessionControls } from "./preview/PreviewSessionControls";

type PreviewMedia = "web" | "phone";

const NO_CAMERA_VALUE = "__none__";

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
		if (!value) continue;
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
							if (file) onUpload(file);
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
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [audioDeviceId, setAudioDeviceId] = useState("");
	const [videoDeviceId, setVideoDeviceId] = useState(NO_CAMERA_VALUE);
	const [devicesLoading, setDevicesLoading] = useState(false);
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

	useEffect(() => {
		if (media !== "web") return;
		if (
			typeof navigator === "undefined" ||
			!navigator.mediaDevices?.enumerateDevices
		) {
			return;
		}

		let cancelled = false;

		async function loadDevices() {
			setDevicesLoading(true);
			try {
				try {
					const stream = await navigator.mediaDevices.getUserMedia({
						audio: true,
						video: true,
					});
					for (const track of stream.getTracks()) track.stop();
				} catch {
					const stream = await navigator.mediaDevices.getUserMedia({
						audio: true,
					});
					for (const track of stream.getTracks()) track.stop();
				}

				const devices = await navigator.mediaDevices.enumerateDevices();
				if (cancelled) return;

				const mics = devices.filter(
					(device) => device.kind === "audioinput" && device.deviceId,
				);
				const cams = devices.filter(
					(device) => device.kind === "videoinput" && device.deviceId,
				);
				setAudioDevices(mics);
				setVideoDevices(cams);
				setAudioDeviceId((current) =>
					current &&
					mics.some((device) => device.deviceId === current)
						? current
						: (mics[0]?.deviceId ?? ""),
				);
				setVideoDeviceId((current) => {
					if (current === NO_CAMERA_VALUE) return current;
					if (cams.some((device) => device.deviceId === current)) {
						return current;
					}
					return NO_CAMERA_VALUE;
				});
			} catch (error) {
				if (!cancelled) {
					toast.error(
						error instanceof Error
							? error.message
							: "Could not access microphone or camera",
					);
				}
			} finally {
				if (!cancelled) setDevicesLoading(false);
			}
		}

		void loadDevices();
		return () => {
			cancelled = true;
		};
	}, [media]);

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
			if (!raw) continue;
			contactMetadata[variable.name] =
				variable.variable_type === "number" ? Number(raw) : raw;
		}
		return contactMetadata;
	}

	async function handleUpload(name: string, file: File) {
		if (!activeOrganizationId) return;
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
		if (!contactMetadata) return;

		if (media === "web" && !audioDeviceId) {
			toast.error("Select a microphone before starting");
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
		if (!sessionCredentials) return null;
		const useCamera = videoDeviceId !== NO_CAMERA_VALUE;
		return (
			<LiveKitRoom
				token={sessionCredentials.token}
				serverUrl={sessionCredentials.serverUrl}
				connect
				audio={
					audioDeviceId
						? { deviceId: { exact: audioDeviceId } }
						: true
				}
				video={
					useCamera ? { deviceId: { exact: videoDeviceId } } : false
				}
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
		audioDeviceId,
		avatarEnabled,
		avatarPreviewUrl,
		onCancel,
		sessionCredentials,
		videoDeviceId,
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
			<div className="flex min-h-0 flex-1 items-center justify-center bg-muted/20 p-4 sm:p-6">
				<div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
					{avatarEnabled && avatarPreviewUrl ? (
						<div className="mb-5 flex justify-center">
							<div className="relative aspect-[3/4] w-24 overflow-hidden rounded-xl border bg-muted">
								{/* Dynamic avatar URL from config; next/image domains vary. */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={avatarPreviewUrl}
									alt="Selected avatar"
									className="size-full object-cover"
								/>
							</div>
						</div>
					) : null}

					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								Media
							</Label>
							<Select
								value={media}
								onValueChange={(value) => {
									if (value === "web" || value === "phone") {
										setMedia(value);
									}
								}}
								disabled={starting}
							>
								<SelectTrigger className="w-full bg-background">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="web">
										Web (browser)
									</SelectItem>
									<SelectItem value="phone">
										Phone (telephony)
									</SelectItem>
								</SelectContent>
							</Select>
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
						) : (
							<>
								<div className="space-y-1.5">
									<Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
										<MicIcon className="size-3.5" />
										Microphone
									</Label>
									{devicesLoading ? (
										<InlineSkeleton className="h-9 rounded-md border bg-background px-3 py-2.5 [&>div]:h-3.5 [&>div]:w-36" />
									) : (
										<Select
											value={audioDeviceId || undefined}
											onValueChange={(value) => {
												if (value)
													setAudioDeviceId(value);
											}}
											disabled={
												starting ||
												audioDevices.length === 0
											}
										>
											<SelectTrigger className="w-full bg-background">
												<SelectValue placeholder="Select microphone" />
											</SelectTrigger>
											<SelectContent>
												{audioDevices.map(
													(device, index) => (
														<SelectItem
															key={
																device.deviceId
															}
															value={
																device.deviceId
															}
														>
															{device.label ||
																`Microphone ${index + 1}`}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
									)}
								</div>
								<div className="space-y-1.5">
									<Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
										<CameraIcon className="size-3.5" />
										Camera
									</Label>
									{devicesLoading ? (
										<InlineSkeleton className="h-9 rounded-md border bg-background px-3 py-2.5 [&>div]:h-3.5 [&>div]:w-28" />
									) : (
										<Select
											value={videoDeviceId}
											onValueChange={(value) => {
												if (value)
													setVideoDeviceId(value);
											}}
											disabled={starting}
										>
											<SelectTrigger className="w-full bg-background">
												<SelectValue placeholder="Select camera" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem
													value={NO_CAMERA_VALUE}
												>
													Don't use camera
												</SelectItem>
												{videoDevices.map(
													(device, index) => (
														<SelectItem
															key={
																device.deviceId
															}
															value={
																device.deviceId
															}
														>
															{device.label ||
																`Camera ${index + 1}`}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
									)}
								</div>
							</>
						)}

						{definedVariables.length > 0 ? (
							<div className="space-y-3 border-t pt-4">
								<div>
									<h3 className="text-sm font-medium text-balance">
										Debug variables
									</h3>
									<p className="mt-1 text-xs text-pretty text-muted-foreground">
										Values for session variables used in
										this preview.
									</p>
									{hasUnsavedVariables ? (
										<p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
											Save draft to test new variables in
											preview.
										</p>
									) : null}
								</div>
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
													({variable.variable_type})
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
						) : hasUnsavedVariables ? (
							<p className="border-t pt-4 text-xs text-amber-600 dark:text-amber-500">
								Save draft to test new variables in preview.
							</p>
						) : null}

						<div className="flex flex-col gap-2 border-t pt-4">
							<Button
								type="button"
								className="w-full gap-2"
								loading={starting}
								disabled={
									starting ||
									(media === "web" &&
										(devicesLoading || !audioDeviceId))
								}
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
