"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import {
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { PreviewSessionControls } from "@/components/saas/agents/preview/PreviewSessionControls";
import { resolvePreviewAvatar } from "@/lib/preview-avatar";
import {
	DEFAULT_SESSION_MODALITIES,
	isTrackMandatory,
	normalizeSessionModalities,
} from "@/lib/session-modalities";

const UNAVAILABLE_MESSAGES = {
	unpublished: "This agent is not published yet.",
} as const;

function parseMetadata(raw: string | null): Record<string, unknown> {
	if (!raw?.trim()) {
		return {};
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		// ignore invalid JSON
	}
	return {};
}

function EmbedLoading() {
	return (
		<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Spinner className="size-4" />
				Loading embed…
			</div>
		</div>
	);
}

export default function EmbedAgentPage() {
	return (
		<Suspense fallback={<EmbedLoading />}>
			<EmbedAgentPageContent />
		</Suspense>
	);
}

function EmbedAgentPageContent() {
	const params = useParams<{ token: string }>();
	const searchParams = useSearchParams();
	const token = params.token;
	const name = searchParams.get("name")?.trim() || "";
	const externalId = searchParams.get("id")?.trim() || "";
	const contactMetadata = useMemo(
		() => parseMetadata(searchParams.get("metadata")),
		[searchParams],
	);

	const [audioDeviceId, setAudioDeviceId] = useState("");
	const [videoDeviceId, setVideoDeviceId] = useState("");
	const [devicesReady, setDevicesReady] = useState(false);
	const [permissionError, setPermissionError] = useState<string | null>(null);
	const [credentials, setCredentials] = useState<{
		token: string;
		serverUrl: string;
		spatialRealAppId: string | null;
	} | null>(null);
	const startAttempted = useRef(false);

	const embedQuery = useQuery(
		orpc.sessions.getEmbedAgent.queryOptions({
			input: { token },
		}),
	);

	const sessionModalities = normalizeSessionModalities(
		embedQuery.data?.agent.sessionModalities ?? DEFAULT_SESSION_MODALITIES,
	);
	const maxDurationSeconds =
		embedQuery.data?.agent.maxDurationSeconds ?? null;
	const audioMandatory = isTrackMandatory(sessionModalities.audio_track);
	const videoMandatory = isTrackMandatory(sessionModalities.video_track);
	const chatMandatory = isTrackMandatory(sessionModalities.chat);
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

	const startMutation = useMutation(
		orpc.sessions.startEmbedSession.mutationOptions({
			onSuccess: (data) => {
				if (!data.participantToken || !data.serverUrl) {
					toast.error("Could not start embed session");
					return;
				}
				setCredentials({
					token: data.participantToken,
					serverUrl: data.serverUrl,
					spatialRealAppId: data.spatialRealAppId ?? null,
				});
			},
			onError: (error) => {
				startAttempted.current = false;
				toast.error(error.message || "Could not start session");
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
			setDevicesReady(true);
			return;
		}

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

			if (videoMandatory) {
				const videoStream = await navigator.mediaDevices.getUserMedia({
					video: true,
				});
				for (const track of videoStream.getTracks()) {
					track.stop();
				}
			}

			const devices = await navigator.mediaDevices.enumerateDevices();
			const mics = devices.filter(
				(device) => device.kind === "audioinput" && device.deviceId,
			);
			const cameras = devices.filter(
				(device) => device.kind === "videoinput" && device.deviceId,
			);
			setAudioDeviceId(mics[0]?.deviceId ?? "");
			setVideoDeviceId(videoMandatory ? (cameras[0]?.deviceId ?? "") : "");

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
					: "Media permission is required to start a session.",
			);
		} finally {
			setDevicesReady(true);
		}
	}, [audioMandatory, videoMandatory]);

	useEffect(() => {
		if (!embedQuery.data?.embed.available) {
			return;
		}
		void loadDevices();
	}, [embedQuery.data?.embed.available, loadDevices]);

	useEffect(() => {
		if (
			!embedQuery.data?.embed.available ||
			!devicesReady ||
			permissionError ||
			credentials ||
			startAttempted.current ||
			startMutation.isPending
		) {
			return;
		}
		if (audioMandatory && !audioDeviceId) {
			return;
		}
		if (videoMandatory && !videoDeviceId) {
			return;
		}

		startAttempted.current = true;
		startMutation.mutate({
			token,
			participantName: name || "Guest",
			name: name || undefined,
			externalId: externalId || undefined,
			contactMetadata:
				Object.keys(contactMetadata).length > 0
					? contactMetadata
					: undefined,
		});
	}, [
		embedQuery.data?.embed.available,
		devicesReady,
		permissionError,
		credentials,
		startMutation.isPending,
		audioMandatory,
		videoMandatory,
		audioDeviceId,
		videoDeviceId,
		token,
		name,
		externalId,
		contactMetadata,
		startMutation.mutate,
	]);

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
					<PreviewSessionControls
						agent={{
							id: embedQuery.data?.agent.id ?? "embed",
							name: embedQuery.data?.agent.name ?? "Agent",
						}}
						avatar={resolvePreviewAvatar({
							enabled:
								embedQuery.data?.agent.avatarEnabled ?? false,
							provider_id:
								embedQuery.data?.agent.avatarProvider ?? null,
							external_avatar_id:
								embedQuery.data?.agent.avatarId ?? null,
						})}
						spatialRealAppId={credentials.spatialRealAppId}
						maxDurationSeconds={maxDurationSeconds}
						chatMandatory={chatMandatory}
						proctoringEnabled={sessionModalities.proctoring.enabled}
						proctoringNotice={proctoringNotice}
						onEnd={() => {
							setCredentials(null);
							startAttempted.current = false;
							void embedQuery.refetch();
						}}
					/>
				</LiveKitRoom>
			</div>
		);
	}

	if (embedQuery.isLoading) {
		return (
			<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Spinner className="size-4" />
					Loading embed…
				</div>
			</div>
		);
	}

	if (embedQuery.isError || !embedQuery.data) {
		return (
			<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
				<div className="w-full space-y-2 rounded-3xl border bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
					<h1 className="font-semibold text-xl tracking-tight">
						Embed unavailable
					</h1>
					<p className="text-sm text-muted-foreground">
						{embedQuery.error?.message ||
							"This embed link is invalid."}
					</p>
				</div>
			</div>
		);
	}

	if (!embedQuery.data.embed.available) {
		const reason = embedQuery.data.embed.unavailableReason;
		return (
			<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
				<div className="w-full space-y-2 rounded-3xl border bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
					<h1 className="font-semibold text-xl tracking-tight">
						Embed unavailable
					</h1>
					<p className="text-sm text-muted-foreground">
						{reason
							? UNAVAILABLE_MESSAGES[reason]
							: "This embed is not available."}
					</p>
				</div>
			</div>
		);
	}

	if (permissionError) {
		return (
			<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
				<div className="w-full space-y-4 rounded-3xl border bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
					<h1 className="font-semibold text-xl tracking-tight">
						{embedQuery.data.agent.name}
					</h1>
					<p className="text-sm text-muted-foreground">
						{permissionError}
					</p>
					<Button
						type="button"
						onClick={() => {
							setDevicesReady(false);
							setPermissionError(null);
							startAttempted.current = false;
							void loadDevices();
						}}
					>
						Try again
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Spinner className="size-4" />
				{startMutation.isPending
					? "Starting session…"
					: "Preparing session…"}
			</div>
		</div>
	);
}
