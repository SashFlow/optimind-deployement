"use client";

import type { LiveKitAvatarSession } from "@spatialreal/web-sdk";
import { type Room, RoomEvent, Track } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import AudioVisualizer from "./AudioVisualizer";
import ChatInput from "./ChatInput";
import TranscriptView from "./TranscriptView";
import { type TranscriptMessage, upsertTranscriptMessage } from "./transcript";

interface AvatarVoiceAgentProps {
	token: string;
	serverUrl: string;
	roomName: string;
	/** SpatialReal session token from your server (or a Studio temporary token). */
	sessionToken: string;
	onDisconnect: () => void;
}

function readSpatialrealConfig() {
	return {
		appId: "app_muipa6l3_1pb8l4x",
		avatarId: "6aed28f9-674c-4ffb-89ee-b447b28aa3ed",
	};
}

export default function AvatarVoiceAgent({
	token,
	serverUrl,
	sessionToken,
	onDisconnect,
}: AvatarVoiceAgentProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const sessionRef = useRef<LiveKitAvatarSession | null>(null);
	const roomRef = useRef<Room | null>(null);
	const initializedRef = useRef(false);
	const roomListenersSetupRef = useRef(false);
	const disconnectingRef = useRef(false);
	const teardownTaskRef = useRef<Promise<void> | null>(null);

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [containerReady, setContainerReady] = useState(false);
	const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
	const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
	const [micTrack, setMicTrack] = useState<Track | undefined>(undefined);
	const [isAvatarFullscreen, setIsAvatarFullscreen] = useState(false);

	const isChatVisible = !isAvatarFullscreen;

	const teardownAvatar = useCallback(async () => {
		if (teardownTaskRef.current) {
			await teardownTaskRef.current;
			return;
		}

		const session = sessionRef.current;

		sessionRef.current = null;
		roomRef.current = null;
		roomListenersSetupRef.current = false;
		initializedRef.current = false;

		teardownTaskRef.current = (async () => {
			if (!session) {
				return;
			}
			try {
				await session.end();
			} catch {
				// Ignore cleanup errors during teardown.
			}
			try {
				await session.dispose();
			} catch (disposeError) {
				console.warn("Failed to dispose avatar session:", disposeError);
			}
		})();

		try {
			await teardownTaskRef.current;
		} finally {
			teardownTaskRef.current = null;
		}
	}, []);

	const setContainerRef = useCallback((node: HTMLDivElement | null) => {
		containerRef.current = node;

		if (!node) {
			return;
		}

		requestAnimationFrame(() => {
			if (node.offsetWidth > 0 && node.offsetHeight > 0) {
				setContainerReady(true);
			}
		});
	}, []);

	const setupRoomEventListeners = useCallback((room: Room) => {
		if (roomListenersSetupRef.current) {
			return;
		}
		roomListenersSetupRef.current = true;

		room.registerTextStreamHandler(
			"lk.transcription",
			async (reader, participantInfo) => {
				const streamId = reader.info.id;
				let text = "";

				const isAgent =
					(participantInfo?.identity?.includes("agent") ||
						participantInfo?.identity?.includes(
							"voice-assistant",
						)) ??
					false;

				for await (const chunk of reader) {
					text += chunk;

					setTranscripts((prev) => {
						const newMessage: TranscriptMessage = {
							id: streamId,
							text,
							participant: isAgent ? "agent" : "user",
							timestamp: new Date(),
							isFinal: false,
						};

						return upsertTranscriptMessage(prev, newMessage);
					});
				}

				const isFinal =
					reader.info.attributes?.["lk.transcription_final"] ===
					"true";

				setTranscripts((prev) => {
					const newMessage: TranscriptMessage = {
						id: streamId,
						text,
						participant: isAgent ? "agent" : "user",
						timestamp: new Date(),
						isFinal,
					};

					return upsertTranscriptMessage(prev, newMessage);
				});
			},
		);

		const handleActiveSpeakers = (speakers: { identity: string }[]) => {
			const agentSpeaking = speakers.some(
				(speaker) =>
					speaker.identity.includes("agent") ||
					speaker.identity.includes("voice-assistant"),
			);
			setIsAgentSpeaking(agentSpeaking);
		};

		room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakers);
	}, []);

	const initializeAvatar = useCallback(async () => {
		if (!containerRef.current || initializedRef.current) {
			return;
		}

		if (
			containerRef.current.offsetWidth === 0 ||
			containerRef.current.offsetHeight === 0
		) {
			return;
		}

		initializedRef.current = true;

		try {
			setIsLoading(true);
			setError(null);

			const config = readSpatialrealConfig();
			const { SpatialReal, createUnlockedAudioContext } = await import(
				"@spatialreal/web-sdk"
			);

			const audioContext = createUnlockedAudioContext();
			const sr = new SpatialReal({
				appId: config.appId,
				logLevel: "warning",
			});

			const session = await sr.createSession({
				avatarId: config.avatarId,
				credential: sessionToken,
				container: containerRef.current,
				livekit: { url: serverUrl, token },
				mic: "required",
				audioContext,
			});

			sessionRef.current = session;

			session.on("state", ({ current }) => {
				if (current === "live") {
					setIsLoading(false);
					const room = session.room;
					if (room) {
						roomRef.current = room;
						setupRoomEventListeners(room);
						const micPub =
							room.localParticipant.getTrackPublication(
								Track.Source.Microphone,
							);
						if (micPub?.track) {
							setMicTrack(micPub.track);
						}
					}
				}
				if (current === "idle" && !disconnectingRef.current) {
					onDisconnect();
				}
			});

			session.on("error", ({ error: eventError }) => {
				setError(eventError.message || String(eventError));
			});

			session.on("stalled", () => {
				void session.reconnect().catch(() => {
					setError("Avatar stream disconnected");
				});
			});

			await session.start();
		} catch (initError) {
			setError(
				initError instanceof Error
					? initError.message
					: "Failed to initialize avatar",
			);
			setIsLoading(false);
		}
	}, [onDisconnect, serverUrl, sessionToken, setupRoomEventListeners, token]);

	useEffect(() => {
		if (!containerReady) {
			return;
		}

		void initializeAvatar();

		return () => {
			disconnectingRef.current = true;
			void teardownAvatar();
		};
	}, [containerReady, initializeAvatar, teardownAvatar]);

	const handleSendMessage = useCallback(async (message: string) => {
		const room = roomRef.current;
		if (!room?.localParticipant) {
			return;
		}

		try {
			await room.localParticipant.sendText(message, { topic: "lk.chat" });

			setTranscripts((prev) => [
				...prev,
				{
					id: `user-${Date.now()}`,
					text: message,
					participant: "user",
					timestamp: new Date(),
					isFinal: true,
				},
			]);
		} catch (sendError) {
			console.error("Failed to send message:", sendError);
		}
	}, []);

	const handleDisconnect = useCallback(async () => {
		disconnectingRef.current = true;
		await teardownAvatar();
		onDisconnect();
	}, [onDisconnect, teardownAvatar]);

	const handleToggleAvatarFullscreen = useCallback(() => {
		setIsAvatarFullscreen((prev) => !prev);
	}, []);

	return (
		<div className="flex h-screen flex-col">
			<header className="flex items-center justify-between bg-slate-800 px-6 py-4">
				<h1 className="text-xl font-semibold">Voice Agent</h1>
				<div className="flex items-center gap-4">
					{isAgentSpeaking && (
						<span className="flex items-center gap-2 text-sm text-green-400">
							<span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
							Agent speaking
						</span>
					)}
					<button
						type="button"
						onClick={handleToggleAvatarFullscreen}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
					>
						{isAvatarFullscreen
							? "Exit fullscreen"
							: "Fullscreen avatar"}
					</button>
					<button
						type="button"
						onClick={() => {
							void handleDisconnect();
						}}
						className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
					>
						Disconnect
					</button>
				</div>
			</header>

			<main className="flex flex-1 flex-col overflow-hidden">
				<div className="flex flex-1 overflow-hidden">
					<div
						className={
							isChatVisible
								? "w-1/2 border-r border-slate-700 p-4"
								: isAvatarFullscreen
									? "w-full p-0"
									: "w-full p-4"
						}
					>
						<div
							className={`relative h-full overflow-hidden bg-slate-900 ${
								isAvatarFullscreen ? "" : "rounded-lg"
							}`}
						>
							<div
								ref={setContainerRef}
								className={`h-full w-full ${isAvatarFullscreen ? "" : "min-h-[400px]"}`}
							/>

							{isLoading && (
								<div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
									<div className="text-center">
										<div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
										<span className="text-sm text-slate-400">
											Loading avatar...
										</span>
									</div>
								</div>
							)}

							{error && (
								<div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
									<div className="text-center text-red-400">
										<span className="mb-2 block">
											Avatar Error
										</span>
										<span className="text-sm text-slate-400">
											{error}
										</span>
									</div>
								</div>
							)}
						</div>
					</div>

					{isChatVisible && (
						<div className="w-1/2 overflow-y-auto">
							<TranscriptView transcripts={transcripts} />
						</div>
					)}
				</div>

				{isChatVisible && (
					<div className="border-t border-slate-700 bg-slate-800 p-4">
						<div className="mx-auto max-w-3xl">
							<div className="mb-4 flex justify-center">
								<AudioVisualizer track={micTrack} />
							</div>

							<ChatInput onSend={handleSendMessage} />
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
