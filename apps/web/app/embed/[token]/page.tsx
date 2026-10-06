"use client";

import { LiveKitRoom } from "@livekit/components-react";
import type {
	GetEmbedAgentOutput,
	StartEmbedSessionInput,
	StartPublicSessionOutput,
} from "@repo/api/modules/sessions/public-types";
import { Spinner } from "@repo/ui/spinner";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { PreviewSessionControls } from "@/components/saas/agents/preview/PreviewSessionControls";
import { PublishPrefetchedCamera } from "@/components/saas/agents/preview/PublishPrefetchedCamera";
import {
	releasePrefetchedCameraTrack,
	resolveLiveKitAudioOption,
	resolveLiveKitVideoOption,
} from "@/components/saas/agents/preview/livekit-prejoin-media";
import {
	type SessionPrejoinMediaSelection,
	SessionPrejoinLobby,
} from "@/components/saas/agents/preview/SessionPrejoinLobby";
import { ProctoringProvider } from "@/context/proctoring-provider";
import { SessionInteractionProvider } from "@/context/session-interaction-provider";
import { useSpatialRealAvatarWarmup } from "@/hooks/useSpatialRealAvatarWarmup";
import { useSpatiusHostRoom } from "@/hooks/useSpatiusHostRoom";
import { resolvePreviewAvatar } from "@/lib/preview-avatar";
import { uploadFaceCaptureFiles } from "@/lib/proctoring/upload-face-capture";
import { uploadIdCaptureFiles } from "@/lib/proctoring/upload-id-capture";
import {
	DEFAULT_SESSION_MODALITIES,
	hasCameraSessionFeatures,
	isTrackMandatory,
	normalizeSessionModalities,
} from "@/lib/session-modalities";
import { fetchEmbedSpatialRealWarmup } from "@/services/api/spatialreal-warmup";

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
	const token = typeof params.token === "string" ? params.token : "";
	const name = searchParams.get("name")?.trim() || "";
	const externalId = searchParams.get("id")?.trim() || "";
	const contactMetadata = useMemo(
		() => parseMetadata(searchParams.get("metadata")),
		[searchParams],
	);

	const [joinMedia, setJoinMedia] =
		useState<SessionPrejoinMediaSelection | null>(null);
	const [credentials, setCredentials] = useState<{
		sessionId: string;
		token: string;
		serverUrl: string;
		spatialRealAppId: string | null;
		spatialRealSessionToken: string | null;
		spatialRealRendererToken: string | null;
		spatiusAppId: string | null;
	} | null>(null);

	const embedQuery = useQuery(
		orpc.sessions.getEmbedAgent.queryOptions({
			input: { token },
		}),
	) as ReturnType<typeof useQuery<GetEmbedAgentOutput>>;

	const sessionModalities = normalizeSessionModalities(
		embedQuery.data?.agent.sessionModalities ?? DEFAULT_SESSION_MODALITIES,
	);
	const maxDurationSeconds =
		embedQuery.data?.agent.maxDurationSeconds ?? null;
	const audioMandatory = isTrackMandatory(sessionModalities.audio_track);
	const proctoringEnabled = sessionModalities.proctoring.enabled;
	const idVerificationEnabled =
		sessionModalities.proctoring.id_verification;
	const faceVerificationEnabled =
		sessionModalities.proctoring.face_verification;
	const cameraFeaturesEnabled = hasCameraSessionFeatures(
		sessionModalities.proctoring,
	);
	const videoMandatory =
		isTrackMandatory(sessionModalities.video_track) || proctoringEnabled;
	const chatMandatory = isTrackMandatory(sessionModalities.chat);

	const previewAvatar = resolvePreviewAvatar({
		enabled: embedQuery.data?.agent.avatarEnabled ?? false,
		provider_id: embedQuery.data?.agent.avatarProvider ?? null,
		external_avatar_id: embedQuery.data?.agent.avatarId ?? null,
	});

	useSpatialRealAvatarWarmup({
		enabled:
			!credentials &&
			Boolean(token) &&
			Boolean(embedQuery.data?.embed.available) &&
			previewAvatar.enabled &&
			previewAvatar.provider === "spatialreal",
		avatarId: previewAvatar.avatarId,
		fetchCredentials: token
			? () => fetchEmbedSpatialRealWarmup({ token })
			: undefined,
	});

	const spatiusSessionActive =
		Boolean(credentials) &&
		previewAvatar.enabled &&
		previewAvatar.provider === "spatius";
	const spatiusHost = useSpatiusHostRoom(spatiusSessionActive);

	const startMutation = useMutation(
		orpc.sessions.startEmbedSession.mutationOptions({
			onSuccess: (data: StartPublicSessionOutput) => {
				if (!data.participantToken || !data.serverUrl) {
					toast.error("Could not start embed session");
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
			},
		}),
	) as ReturnType<
		typeof useMutation<
			StartPublicSessionOutput,
			Error,
			StartEmbedSessionInput
		>
	>;

	async function handleStart(selection: SessionPrejoinMediaSelection) {
		setJoinMedia(selection);
		try {
			const data = await startMutation.mutateAsync({
				token,
				participantName: name || "Guest",
				name: name || undefined,
				externalId: externalId || undefined,
				contactMetadata:
					Object.keys(contactMetadata).length > 0
						? contactMetadata
						: undefined,
			});
			if (!data.participantToken || !data.serverUrl) {
				setJoinMedia(null);
				throw new Error("Could not start embed session");
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
					id: embedQuery.data?.agent.id ?? "embed",
					name: embedQuery.data?.agent.name ?? "Agent",
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
					void embedQuery.refetch();
				}}
			/>
		);
		const audio = resolveLiveKitAudioOption(joinMedia);
		const video = resolveLiveKitVideoOption(joinMedia);
		const prefetchedCamera = joinMedia?.cameraTrack;
		return (
			<div className="flex min-h-screen flex-col bg-background">
				<LiveKitRoom
					token={credentials.token}
					serverUrl={credentials.serverUrl}
					room={spatiusHost.room}
					connect={spatiusHost.connect}
					audio={audio}
					video={video}
					className="flex min-h-screen flex-col"
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

	return (
		<div className="flex min-h-screen w-full flex-col bg-background">
			<SessionPrejoinLobby
				title={embedQuery.data.agent.name}
				subtitle="Ready when you are"
				audioMandatory={audioMandatory}
				videoMandatory={videoMandatory}
				showWebMedia
				starting={startMutation.isPending}
				startLabel="Start session"
				startingLabel="Starting session…"
				onStart={handleStart}
			/>
		</div>
	);
}
