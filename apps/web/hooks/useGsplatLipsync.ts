"use client";

import type { Room } from "livekit-client";
import { RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { useCallback, useEffect, useRef } from "react";
import { ARKitLipSyncEngine } from "@/lib/arkit-lipsync/engine/ARKitLipSyncEngine";
import { phoneticDetailsToLipSyncInput } from "@/lib/arkit-lipsync/inworld/normalize";
import {
	LIPSYNC_TOPIC,
	type LipsyncPacket,
} from "@/lib/arkit-lipsync/live-types";
import { WebAudioClock } from "@/lib/arkit-lipsync/sync/clocks";

/** Delay before starting audio playback + lipsync clock so the engine can ingest phonemes. */
const LIPSYNC_START_BUFFER_MS = 100;
/** Match DEFAULT_COARTICULATION.releaseSeconds before zeroing speech into idle. */
const LIPSYNC_IDLE_RELEASE_MS = 40;

export type UseGsplatLipsyncResult = {
	engine: ARKitLipSyncEngine;
	audioRef: React.RefObject<HTMLAudioElement | null>;
	getTime: () => number;
	/** Remote audio track SIDs owned by this hook (exclude from RoomAudioRenderer). */
	ownedAudioSids: React.MutableRefObject<Set<string>>;
};

/**
 * Client-side lipsync for the arkit provider — mirrors avatar LivePage:
 * LiveKit `avatar.lipsync` packets + remote audio clock, with a 100ms start
 * buffer and idle transition when audio/turn ends.
 */
export function useGsplatLipsync(room: Room | null): UseGsplatLipsyncResult {
	const engineRef = useRef(new ARKitLipSyncEngine({ speechOnly: false }));
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const clockRef = useRef<WebAudioClock | null>(null);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const activeTurnRef = useRef<string | null>(null);
	const attachedTracksRef = useRef<Set<string>>(new Set());
	const startBufferTimerRef = useRef<number | null>(null);
	const idleTimerRef = useRef<number | null>(null);
	const holdAudioUntilStartRef = useRef(false);

	const engine = engineRef.current;

	const getTime = useCallback(() => {
		const clock = clockRef.current;
		if (clock && !clock.paused) {
			return clock.currentTime;
		}
		return engine.getPlayhead();
	}, [engine]);

	const clearStartBufferTimer = useCallback(() => {
		if (startBufferTimerRef.current !== null) {
			window.clearTimeout(startBufferTimerRef.current);
			startBufferTimerRef.current = null;
		}
	}, []);

	const clearIdleTimer = useCallback(() => {
		if (idleTimerRef.current !== null) {
			window.clearTimeout(idleTimerRef.current);
			idleTimerRef.current = null;
		}
	}, []);

	const beginPlaybackAfterBuffer = useCallback(() => {
		clearStartBufferTimer();
		holdAudioUntilStartRef.current = false;
		const audio = audioRef.current;
		if (audio) {
			audio.muted = false;
			void audio.play().catch(() => {
				/* autoplay may require a user gesture */
			});
		}
		const clock = clockRef.current;
		clock?.stop();
		clock?.start(0);
		engine.play();
	}, [clearStartBufferTimer, engine]);

	const armTurnStart = useCallback(
		(turnId: string) => {
			clearIdleTimer();
			clearStartBufferTimer();
			activeTurnRef.current = turnId;
			engine.setPhonemes({ phonemes: [], duration: 0 });
			engine.stop();
			clockRef.current?.stop();
			holdAudioUntilStartRef.current = true;
			const audio = audioRef.current;
			if (audio) {
				audio.muted = true;
			}
			startBufferTimerRef.current = window.setTimeout(() => {
				startBufferTimerRef.current = null;
				if (activeTurnRef.current !== turnId) {
					return;
				}
				beginPlaybackAfterBuffer();
			}, LIPSYNC_START_BUFFER_MS);
		},
		[
			beginPlaybackAfterBuffer,
			clearIdleTimer,
			clearStartBufferTimer,
			engine,
		],
	);

	const transitionToIdle = useCallback(() => {
		clearStartBufferTimer();
		clearIdleTimer();
		holdAudioUntilStartRef.current = false;
		activeTurnRef.current = null;
		clockRef.current?.pause();
		idleTimerRef.current = window.setTimeout(() => {
			idleTimerRef.current = null;
			engine.stop();
			engine.setPhonemes({ phonemes: [], duration: 0 });
		}, LIPSYNC_IDLE_RELEASE_MS);
	}, [clearIdleTimer, clearStartBufferTimer, engine]);

	const applyPacket = useCallback(
		(packet: LipsyncPacket) => {
			if (packet.type === "turn_start") {
				armTurnStart(packet.turn_id);
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
					armTurnStart(packet.turn_id);
				}
				const input = phoneticDetailsToLipSyncInput(
					packet.phoneticDetails,
				);
				if (input.phonemes.length) {
					engine.appendPhonemes(input.phonemes, input.duration);
				}
				return;
			}

			if (packet.type === "turn_end") {
				if (packet.turn_id === activeTurnRef.current) {
					transitionToIdle();
				}
			}
		},
		[armTurnStart, engine, transitionToIdle],
	);

	const attachRemoteAudio = useCallback(
		(track: RemoteTrack) => {
			if (track.kind !== Track.Kind.Audio) {
				return;
			}
			const sid = track.sid ?? track.mediaStreamTrack?.id;
			if (!sid || attachedTracksRef.current.has(sid)) {
				return;
			}
			attachedTracksRef.current.add(sid);

			let audio = audioRef.current;
			if (!audio) {
				audio = new Audio();
				audio.autoplay = true;
				audioRef.current = audio;
				audio.addEventListener("ended", () => {
					if (activeTurnRef.current) {
						transitionToIdle();
					}
				});
			}
			track.attach(audio);

			if (holdAudioUntilStartRef.current) {
				audio.muted = true;
			} else {
				audio.muted = false;
				void audio.play().catch(() => {
					/* autoplay may require a user gesture */
				});
			}

			if (!audioCtxRef.current) {
				audioCtxRef.current = new AudioContext();
				clockRef.current = new WebAudioClock(audioCtxRef.current);
			}
			void audioCtxRef.current.resume();
		},
		[transitionToIdle],
	);

	useEffect(() => {
		if (!room) {
			return;
		}

		const onTrackSubscribed = (track: RemoteTrack) => {
			attachRemoteAudio(track);
		};

		const onTrackUnsubscribed = (track: RemoteTrack) => {
			const sid = track.sid ?? track.mediaStreamTrack?.id;
			if (sid) {
				attachedTracksRef.current.delete(sid);
			}
			track.detach();
			if (track.kind === Track.Kind.Audio && activeTurnRef.current) {
				transitionToIdle();
			}
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
					attachRemoteAudio(pub.track);
				}
			}
		}

		return () => {
			room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
			room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
			room.off(RoomEvent.DataReceived, onData);
			clearStartBufferTimer();
			clearIdleTimer();
			holdAudioUntilStartRef.current = false;
			attachedTracksRef.current.clear();
			activeTurnRef.current = null;
			clockRef.current?.stop();
			engine.stop();
			engine.setPhonemes({ phonemes: [], duration: 0 });
		};
	}, [
		applyPacket,
		attachRemoteAudio,
		clearIdleTimer,
		clearStartBufferTimer,
		engine,
		room,
		transitionToIdle,
	]);

	useEffect(() => {
		return () => {
			void audioCtxRef.current?.close();
			audioCtxRef.current = null;
			clockRef.current = null;
		};
	}, []);

	return {
		engine,
		audioRef,
		getTime,
		ownedAudioSids: attachedTracksRef,
	};
}
