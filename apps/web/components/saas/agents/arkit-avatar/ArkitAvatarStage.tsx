"use client";

import { cn } from "@repo/ui/utils";
import {
	RoomEvent,
	Track,
	type RemoteTrack,
	type Room,
} from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AvatarViewport } from "@/components/saas/agents/arkit-avatar/AvatarViewport";
import { ARKitLipSyncEngine } from "@/lib/arkit-lipsync/engine/ARKitLipSyncEngine";
import { phoneticDetailsToLipSyncInput } from "@/lib/arkit-lipsync/inworld/normalize";
import {
	LIPSYNC_TOPIC,
	type LipsyncPacket,
} from "@/lib/arkit-lipsync/live/types";
import { WebAudioClock } from "@/lib/arkit-lipsync/sync/clocks";

/**
 * Client-rendered 3DGS (FLAME) avatar: agent audio + `avatar.lipsync` phoneme
 * packets drive ARKit blendshapes on the Gaussian-splat renderer.
 */
export default function ArkitAvatarStage({
	room,
	zipUrl,
	compact = false,
	className,
}: {
	room: Room;
	zipUrl: string;
	compact?: boolean;
	className?: string;
}) {
	const engineRef = useRef(new ARKitLipSyncEngine({ speechOnly: false }));
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const clockRef = useRef<WebAudioClock | null>(null);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const activeTurnRef = useRef<string | null>(null);
	const attachedTracksRef = useRef<Set<string>>(new Set());
	const [ready, setReady] = useState(false);

	const engine = engineRef.current;

	const handleReady = useCallback(() => {
		setReady(true);
	}, []);

	const getTime = useCallback(() => {
		const clock = clockRef.current;
		if (clock && !clock.paused) {
			return clock.currentTime;
		}
		return engine.getPlayhead();
	}, [engine]);

	const getChatState = useCallback(() => {
		return activeTurnRef.current ? "Responding" : "Idle";
	}, []);

	const applyPacket = useCallback(
		(packet: LipsyncPacket) => {
			if (packet.type === "turn_start") {
				activeTurnRef.current = packet.turn_id;
				engine.setPhonemes({ phonemes: [], duration: 0 });
				engine.play();
				const clock = clockRef.current;
				clock?.stop();
				clock?.start(0);
				return;
			}

			if (packet.type === "phonemes") {
				if (
					activeTurnRef.current &&
					packet.turn_id &&
					packet.turn_id !== activeTurnRef.current
				) {
					return;
				}
				if (!activeTurnRef.current) {
					activeTurnRef.current = packet.turn_id;
					engine.setPhonemes({ phonemes: [], duration: 0 });
					engine.play();
					clockRef.current?.stop();
					clockRef.current?.start(0);
				}
				const input = phoneticDetailsToLipSyncInput(packet.phoneticDetails);
				if (input.phonemes.length) {
					engine.appendPhonemes(input.phonemes, input.duration);
				}
				return;
			}

			if (packet.type === "turn_end") {
				if (packet.turn_id === activeTurnRef.current) {
					activeTurnRef.current = null;
					clockRef.current?.pause();
				}
			}
		},
		[engine],
	);

	const attachRemoteAudio = useCallback((track: RemoteTrack) => {
		if (track.kind !== Track.Kind.Audio) {
			return;
		}
		const sid = track.sid ?? track.mediaStreamTrack?.id;
		if (!sid || attachedTracksRef.current.has(sid)) {
			return;
		}
		attachedTracksRef.current.add(sid);

		const audio = audioRef.current;
		if (!audio) {
			return;
		}
		track.attach(audio);
		void audio.play().catch(() => {
			/* autoplay may require a prior user gesture from Start preview */
		});

		if (!audioCtxRef.current) {
			audioCtxRef.current = new AudioContext();
			clockRef.current = new WebAudioClock(audioCtxRef.current);
		}
		void audioCtxRef.current.resume();
	}, []);

	useEffect(() => {
		const onTrackSubscribed = (track: RemoteTrack) => {
			attachRemoteAudio(track);
		};

		const onTrackUnsubscribed = (track: RemoteTrack) => {
			const sid = track.sid ?? track.mediaStreamTrack?.id;
			if (sid) {
				attachedTracksRef.current.delete(sid);
			}
			track.detach();
		};

		const onData = (
			payload: Uint8Array,
			_participant: unknown,
			_kind: unknown,
			topic?: string,
		) => {
			if (topic && topic !== LIPSYNC_TOPIC) {
				return;
			}
			try {
				const text = new TextDecoder().decode(payload);
				const packet = JSON.parse(text) as LipsyncPacket;
				if (!packet?.type) {
					return;
				}
				applyPacket(packet);
			} catch (err) {
				console.warn("arkit lipsync packet parse failed", err);
			}
		};

		room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
		room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
		room.on(RoomEvent.DataReceived, onData);

		for (const participant of room.remoteParticipants.values()) {
			for (const pub of participant.trackPublications.values()) {
				if (pub.track && pub.kind === Track.Kind.Audio) {
					attachRemoteAudio(pub.track as RemoteTrack);
				}
			}
		}

		return () => {
			room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
			room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
			room.off(RoomEvent.DataReceived, onData);
			attachedTracksRef.current.clear();
			activeTurnRef.current = null;
			clockRef.current?.stop();
			engine.stop();
			engine.setPhonemes({ phonemes: [], duration: 0 });
			void audioCtxRef.current?.close();
			audioCtxRef.current = null;
			clockRef.current = null;
		};
	}, [room, attachRemoteAudio, applyPacket, engine]);

	return (
		<div
			className={cn(
				"relative size-full overflow-hidden bg-white",
				className,
			)}
		>
			<AvatarViewport
				engine={engine}
				audioRef={audioRef}
				zipUrl={zipUrl}
				getTime={getTime}
				getChatState={getChatState}
				onReady={handleReady}
				className="size-full"
			/>
			{!ready ? (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
					<p
						className={cn(
							"text-white/80",
							compact ? "text-xs" : "text-sm",
						)}
					>
						Loading avatar…
					</p>
				</div>
			) : null}
			<audio ref={audioRef} className="hidden" autoPlay />
		</div>
	);
}
