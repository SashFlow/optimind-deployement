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
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MicIcon, PhoneIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PreviewSessionControls } from "@/components/saas/agents/preview/PreviewSessionControls";
import type { AgentVariableDefinition } from "@/lib/agent-config";
import { normalizePhoneNumber } from "@/lib/phone";

type MediaMode = "web" | "phone";

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
		if (!raw) continue;
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
	const [name, setName] = useState("");
	const [media, setMedia] = useState<MediaMode>("web");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [variableValues, setVariableValues] = useState<
		Record<string, string>
	>({});
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
	const [audioDeviceId, setAudioDeviceId] = useState("");
	const [devicesLoading, setDevicesLoading] = useState(false);
	const [permissionError, setPermissionError] = useState<string | null>(null);
	const [credentials, setCredentials] = useState<{
		token: string;
		serverUrl: string;
	} | null>(null);
	const [phoneDispatch, setPhoneDispatch] = useState<{
		roomName: string;
		phoneNumber: string;
	} | null>(null);

	const trialQuery = useQuery(
		orpc.sessions.getTrialLink.queryOptions({
			input: { token },
		}),
	);

	const startMutation = useMutation(
		orpc.sessions.startTrialSession.mutationOptions({
			onSuccess: (data) => {
				if (data.channel === "PHONE") {
					setPhoneDispatch({
						roomName: data.roomName,
						phoneNumber: data.phoneNumber ?? phoneNumber,
					});
					toast.success(
						`Calling ${data.phoneNumber ?? phoneNumber}`,
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
					token: data.participantToken,
					serverUrl: data.serverUrl,
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
				"This browser does not support microphone access.",
			);
			return;
		}

		setDevicesLoading(true);
		setPermissionError(null);
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			for (const track of stream.getTracks()) track.stop();

			const devices = await navigator.mediaDevices.enumerateDevices();
			const mics = devices.filter(
				(device) => device.kind === "audioinput" && device.deviceId,
			);
			setAudioDevices(mics);
			setAudioDeviceId((current) =>
				current && mics.some((device) => device.deviceId === current)
					? current
					: (mics[0]?.deviceId ?? ""),
			);
			if (mics.length === 0) {
				setPermissionError(
					"No microphone found. Connect a mic and try again.",
				);
			}
		} catch (error) {
			setPermissionError(
				error instanceof Error
					? error.message
					: "Microphone permission is required to start a session.",
			);
			setAudioDevices([]);
			setAudioDeviceId("");
		} finally {
			setDevicesLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!trialQuery.data?.trial.available) return;
		if (media !== "web") return;
		void loadDevices();
	}, [trialQuery.data?.trial.available, media, loadDevices]);

	function handleStart() {
		const variables =
			(trialQuery.data?.agent.variables as AgentVariableDefinition[]) ??
			[];
		const contactMetadata = buildContactMetadata(variables, variableValues);
		if (!contactMetadata) return;

		if (media === "phone") {
			const normalized = normalizePhoneNumber(phoneNumber);
			if (!normalized) {
				toast.error("Enter a valid phone number");
				return;
			}
			startMutation.mutate({
				token,
				participantName: name.trim() || "Guest",
				contactMetadata,
				phoneNumber: normalized,
			});
			return;
		}

		if (!audioDeviceId) {
			toast.error("Select a microphone before starting");
			return;
		}

		startMutation.mutate({
			token,
			participantName: name.trim() || "Guest",
			contactMetadata,
		});
	}

	if (credentials) {
		return (
			<div className="flex min-h-screen flex-col bg-background">
				<LiveKitRoom
					token={credentials.token}
					serverUrl={credentials.serverUrl}
					connect
					audio={
						audioDeviceId
							? { deviceId: { exact: audioDeviceId } }
							: true
					}
					video={false}
					className="flex min-h-screen flex-col"
				>
					<PreviewSessionControls
						agent={{
							id: trialQuery.data?.agent.id ?? "trial",
							name: trialQuery.data?.agent.name ?? "Agent",
						}}
						avatarEnabled={
							trialQuery.data?.agent.avatarEnabled ?? false
						}
						onEnd={() => {
							setCredentials(null);
							void trialQuery.refetch();
						}}
					/>
				</LiveKitRoom>
			</div>
		);
	}

	if (phoneDispatch) {
		return (
			<div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-8 sm:px-6 sm:py-10">
				<div className="w-full space-y-5 rounded-3xl border bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
					<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
						<PhoneIcon className="size-6" />
					</div>
					<div className="space-y-1">
						<h1 className="font-semibold text-xl tracking-tight">
							Outbound call dispatched
						</h1>
						<p className="text-sm text-muted-foreground">
							Calling {phoneDispatch.phoneNumber}
						</p>
						<p className="text-xs text-muted-foreground">
							Room {phoneDispatch.roomName}
						</p>
					</div>
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
		!devicesLoading && Boolean(audioDeviceId) && !permissionError;
	const canStartPhone = phoneNumber.trim().length > 0;
	const canStart =
		trial.available &&
		!startMutation.isPending &&
		(media === "web" ? canStartWeb : canStartPhone);

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-8 sm:px-6 sm:py-10">
			<div className="w-full space-y-6 rounded-3xl border bg-card p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">
						Shared demo link
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						{agent.name}
					</h1>
					{trial.label ? (
						<p className="text-sm text-muted-foreground">
							{trial.label}
						</p>
					) : null}
				</div>

				<div className="grid gap-2 text-sm text-muted-foreground">
					<p>
						Sessions left:{" "}
						<span className="font-medium text-foreground">
							{trial.remaining}
						</span>
					</p>
					<p>
						Expires:{" "}
						<span className="font-medium text-foreground">
							{trial.expiresAt
								? new Date(trial.expiresAt).toLocaleDateString()
								: "Never"}
						</span>
					</p>
				</div>

				{unavailableMessage ? (
					<div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
						{unavailableMessage}
					</div>
				) : (
					<>
						<div className="space-y-2">
							<Label htmlFor="guest-name">
								Your name (optional)
							</Label>
							<Input
								id="guest-name"
								value={name}
								onChange={(event) =>
									setName(event.target.value)
								}
								placeholder="Guest"
								autoComplete="name"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="guest-media">How to join</Label>
							<Select
								value={media}
								onValueChange={(value) => {
									if (value === "web" || value === "phone") {
										setMedia(value);
									}
								}}
							>
								<SelectTrigger id="guest-media">
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
							<div className="space-y-2">
								<Label htmlFor="guest-phone">
									Phone number
								</Label>
								<Input
									id="guest-phone"
									type="tel"
									value={phoneNumber}
									onChange={(event) =>
										setPhoneNumber(event.target.value)
									}
									placeholder="+91 98765 43210"
									autoComplete="tel"
								/>
							</div>
						) : (
							<div className="space-y-2">
								<Label htmlFor="guest-mic">Microphone</Label>
								{devicesLoading ? (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Spinner className="size-4" />
										Requesting microphone access…
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
											Allow microphone
										</Button>
									</div>
								) : (
									<Select
										value={audioDeviceId}
										onValueChange={setAudioDeviceId}
									>
										<SelectTrigger id="guest-mic">
											<SelectValue placeholder="Select microphone" />
										</SelectTrigger>
										<SelectContent>
											{audioDevices.map((device) => (
												<SelectItem
													key={device.deviceId}
													value={device.deviceId}
												>
													{device.label ||
														"Microphone"}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</div>
						)}

						{variables.length > 0 ? (
							<div className="space-y-3">
								<p className="text-sm font-medium">
									Call variables
								</p>
								{variables.map((variable) => (
									<div
										key={variable.name}
										className="space-y-2"
									>
										<Label
											htmlFor={`share-var-${variable.name}`}
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
												variableValues[variable.name] ??
												""
											}
											onChange={(value) =>
												setVariableValues((current) => ({
													...current,
													[variable.name]: value,
												}))
											}
										/>
									</div>
								))}
							</div>
						) : null}
					</>
				)}

				<Button
					type="button"
					className="w-full"
					loading={startMutation.isPending}
					disabled={!canStart}
					onClick={handleStart}
				>
					{!trial.available
						? "Link unavailable"
						: media === "phone"
							? "Call me"
							: "Start session"}
				</Button>
			</div>
		</div>
	);
}
