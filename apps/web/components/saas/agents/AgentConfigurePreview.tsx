"use client";

import {
	LiveKitRoom,
	RoomAudioRenderer,
	useConnectionState,
	useParticipants,
	useRoomContext,
	useVoiceAssistant,
} from "@livekit/components-react";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/utils";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { ConnectionState, RoomEvent, type Track } from "livekit-client";
import { MicIcon, PlayIcon, UploadIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApiClient } from "@/components/shared/components/ApiClientProvider";
import type { AgentVariableDefinition } from "@/lib/agent-config";
import { fetchSessionCredentials } from "@/services/api/livekit";
import { uploadPreviewAsset } from "@/services/api/preview-assets";
import type { Agent } from "@/services/api/types";

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

function isAgentParticipant(identity: string) {
	return !identity.startsWith("user-");
}

function AvatarVideo({
	trackRef,
}: {
	trackRef: { publication?: { track?: Track | null } | null };
}) {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const videoEl = videoRef.current;
		const track = trackRef.publication?.track;
		if (!videoEl || !track) return;

		track.attach(videoEl);
		return () => {
			track.detach(videoEl);
		};
	}, [trackRef]);

	return (
		<video
			ref={videoRef}
			autoPlay
			playsInline
			className="size-full object-cover"
		/>
	);
}

function PreviewSessionControls({
	agent,
	avatarEnabled,
	avatarPreviewUrl,
	onEnd,
}: {
	agent: Agent;
	avatarEnabled: boolean;
	avatarPreviewUrl?: string | null;
	onEnd: () => void;
}) {
	const room = useRoomContext();
	const connectionState = useConnectionState();
	const participants = useParticipants();
	const { videoTrack } = useVoiceAssistant();
	const isConnected = connectionState === ConnectionState.Connected;
	const hasAgent = participants.some((p) => isAgentParticipant(p.identity));
	const [agentWaitTimedOut, setAgentWaitTimedOut] = useState(false);
	const showAvatar =
		avatarEnabled && (Boolean(videoTrack) || Boolean(avatarPreviewUrl));
	const shouldWaitForAgent = isConnected && !hasAgent;

	if (!shouldWaitForAgent && agentWaitTimedOut) {
		setAgentWaitTimedOut(false);
	}

	useEffect(() => {
		if (!shouldWaitForAgent) return;
		const timer = window.setTimeout(
			() => setAgentWaitTimedOut(true),
			15_000,
		);
		return () => window.clearTimeout(timer);
	}, [shouldWaitForAgent]);

	useEffect(() => {
		function handleDisconnected() {
			toast.error("Preview session disconnected");
		}
		function handleMediaDeviceError(error: Error) {
			toast.error(error.message || "Microphone access failed");
		}
		room.on(RoomEvent.Disconnected, handleDisconnected);
		room.on(RoomEvent.MediaDevicesError, handleMediaDeviceError);
		return () => {
			room.off(RoomEvent.Disconnected, handleDisconnected);
			room.off(RoomEvent.MediaDevicesError, handleMediaDeviceError);
		};
	}, [room]);

	const statusLabel = (() => {
		if (!isConnected) return "Connecting...";
		if (hasAgent) return `Live with ${agent.name}`;
		if (agentWaitTimedOut) {
			return "Waiting for agent — ensure the worker is running";
		}
		return "Waiting for agent...";
	})();

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-5 p-6">
			{showAvatar ? (
				<div className="relative aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-xl border bg-muted shadow-sm">
					{videoTrack ? (
						<AvatarVideo trackRef={videoTrack} />
					) : avatarPreviewUrl ? (
						// Dynamic avatar URL from LiveKit/config; next/image domains vary.
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={avatarPreviewUrl}
							alt="Avatar preview"
							className="size-full object-cover"
						/>
					) : null}
				</div>
			) : null}
			<p className="text-center text-sm text-muted-foreground">
				{statusLabel}
			</p>
			<Button
				type="button"
				size="icon-lg"
				aria-label={hasAgent ? `Talking to ${agent.name}` : statusLabel}
				className={cn(
					"size-16 rounded-full shadow-sm",
					hasAgent && "ring-4 ring-primary/20",
				)}
				disabled={!hasAgent}
			>
				<MicIcon className="size-7" />
			</Button>
			<Button
				type="button"
				variant="outline"
				size="icon-lg"
				aria-label="End preview session"
				className="size-11 rounded-full"
				onClick={() => {
					void room.disconnect();
					onEnd();
				}}
			>
				<XIcon className="size-5" />
			</Button>
			<RoomAudioRenderer />
		</div>
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
	const [sessionCredentials, setSessionCredentials] = useState<{
		token: string;
		serverUrl: string;
		contactMetadata: Record<string, unknown>;
	} | null>(null);

	const definedVariables = savedVariables.filter((v) => v.name.trim());

	function updateVariableValue(name: string, value: string) {
		setVariableValues((current) => ({ ...current, [name]: value }));
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

	async function handleStartSession() {
		if (!activeOrganizationId || !draftVersionId) {
			toast.error("Save the draft before starting a preview session");
			return;
		}

		const validationError = validateVariableValues(
			definedVariables,
			variableValues,
		);
		if (validationError) {
			toast.error(validationError);
			return;
		}

		const contactMetadata: Record<string, unknown> = {};
		for (const variable of definedVariables) {
			const raw = variableValues[variable.name]?.trim();
			if (!raw) continue;
			contactMetadata[variable.name] =
				variable.variable_type === "number" ? Number(raw) : raw;
		}

		try {
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
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to start session",
			);
		}
	}

	function handleEndSession() {
		setSessionCredentials(null);
		onCancel?.();
	}

	const roomContent = useMemo(() => {
		if (!sessionCredentials) return null;
		return (
			<LiveKitRoom
				token={sessionCredentials.token}
				serverUrl={sessionCredentials.serverUrl}
				connect
				audio
				video={false}
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
	}, [agent, avatarEnabled, avatarPreviewUrl, onCancel, sessionCredentials]);

	if (sessionCredentials) {
		return (
			<div className={cn("flex h-full min-h-0 flex-col", className)}>
				<div className="flex min-h-0 flex-1 flex-col bg-muted/20">
					{roomContent}
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex h-full min-h-0 flex-col", className)}>
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/20">
				<div className="flex flex-col gap-4 p-4">
					{avatarEnabled && avatarPreviewUrl ? (
						<div className="flex justify-center">
							<div className="relative aspect-[3/4] w-full max-w-[180px] overflow-hidden rounded-xl border bg-muted shadow-sm">
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
					<div>
						<h3 className="text-sm font-semibold">
							Debug variables
						</h3>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Provide values for saved session variables before
							starting preview.
						</p>
						{hasUnsavedVariables ? (
							<p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
								Save draft to test new variables in preview.
							</p>
						) : null}
					</div>

					{definedVariables.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							No variables defined. You can start a preview
							session directly.
						</p>
					) : (
						<div className="space-y-3">
							{definedVariables.map((variable) => (
								<div
									key={variable.name}
									className="space-y-1.5"
								>
									<Label
										htmlFor={`preview-var-${variable.name}`}
										className="text-xs"
									>
										{variable.name}
										{variable.required ? (
											<span className="text-destructive">
												{" "}
												*
											</span>
										) : null}
										<span className="ml-1.5 font-normal text-muted-foreground">
											({variable.variable_type})
										</span>
									</Label>
									<VariableInput
										variable={variable}
										value={
											variableValues[variable.name] ?? ""
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
											uploadingField === variable.name
										}
									/>
								</div>
							))}
						</div>
					)}

					<div className="flex flex-col gap-2 pt-2">
						<Button
							type="button"
							onClick={() => void handleStartSession()}
						>
							<PlayIcon />
							Start session
						</Button>
						{onCancel ? (
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
							>
								Cancel
							</Button>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
