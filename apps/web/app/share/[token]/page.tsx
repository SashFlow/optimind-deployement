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
import { MicIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PreviewSessionControls } from "@/components/saas/agents/preview/PreviewSessionControls";
import type { AgentVariableDefinition } from "@/lib/agent-config";

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
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [audioDeviceId, setAudioDeviceId] = useState("");
	const [videoDeviceId, setVideoDeviceId] = useState("");
	const [devicesLoading, setDevicesLoading] = useState(false);
	const [permissionError, setPermissionError] = useState<string | null>(null);
	const [credentials, setCredentials] = useState<{
		token: string;
		serverUrl: string;
	} | null>(null);

	const trialQuery = useQuery(
		orpc.sessions.getTrialLink.queryOptions({
			input: { token },
		}),
	);

	const startMutation = useMutation(
		orpc.sessions.startTrialSession.mutationOptions({
			onSuccess: (data) => {
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
				"This browser does not support microphone or camera access.",
			);
			return;
		}

		setDevicesLoading(true);
		setPermissionError(null);
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: true,
			});
			for (const track of stream.getTracks()) {
				track.stop();
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
			setVideoDeviceId((current) =>
				current && cameras.some((device) => device.deviceId === current)
					? current
					: (cameras[0]?.deviceId ?? ""),
			);
			if (mics.length === 0) {
				setPermissionError(
					"No microphone found. Connect a mic and try again.",
				);
			} else if (cameras.length === 0) {
				setPermissionError(
					"No camera found. Connect a camera and try again.",
				);
			}
		} catch (error) {
			setPermissionError(
				error instanceof Error
					? error.message
					: "Microphone and camera permission is required to start a session.",
			);
			setAudioDevices([]);
			setVideoDevices([]);
			setAudioDeviceId("");
			setVideoDeviceId("");
		} finally {
			setDevicesLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!trialQuery.data?.trial.available) {
			return;
		}
		void loadDevices();
	}, [trialQuery.data?.trial.available, loadDevices]);

	function handleStart() {
		const variables =
			(trialQuery.data?.agent.variables as AgentVariableDefinition[]) ??
			[];
		const contactMetadata = buildContactMetadata(variables, variableValues);
		if (!contactMetadata) {
			return;
		}

		if (!audioDeviceId) {
			toast.error("Select a microphone before starting");
			return;
		}

		if (!videoDeviceId) {
			toast.error("Select a camera before starting");
			return;
		}

		startMutation.mutate({
			token,
			participantName: "Guest",
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
					video={
						videoDeviceId
							? { deviceId: { exact: videoDeviceId } }
							: true
					}
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
	const canStart =
		trial.available &&
		!startMutation.isPending &&
		!devicesLoading &&
		Boolean(audioDeviceId) &&
		Boolean(videoDeviceId) &&
		!permissionError;

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
							{devicesLoading ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Spinner className="size-4" />
									Requesting microphone and camera access…
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
										Allow microphone & camera
									</Button>
								</div>
							) : (
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="min-w-0 space-y-2">
										<Label htmlFor="guest-mic">
											Microphone
										</Label>
										<Select
											value={audioDeviceId}
											onValueChange={setAudioDeviceId}
										>
											<SelectTrigger
												id="guest-mic"
												className="w-full"
											>
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
									</div>

									<div className="min-w-0 space-y-2">
										<Label htmlFor="guest-cam">
											Camera
										</Label>
										<Select
											value={videoDeviceId}
											onValueChange={setVideoDeviceId}
										>
											<SelectTrigger
												id="guest-cam"
												className="w-full"
											>
												<SelectValue placeholder="Select camera" />
											</SelectTrigger>
											<SelectContent>
												{videoDevices.map((device) => (
													<SelectItem
														key={device.deviceId}
														value={device.deviceId}
													>
														{device.label ||
															"Camera"}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							)}

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
							: "Start session"}
					</Button>
				</div>
			</div>
		</div>
	);
}
