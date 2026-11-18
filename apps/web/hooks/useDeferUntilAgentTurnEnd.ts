"use client";

import { type AgentState, useVoiceAssistant } from "@livekit/components-react";
import { useCallback, useEffect, useRef } from "react";

/** Brief settle so the last TTS frame finishes before UI steals focus. */
const TURN_END_SETTLE_MS = 300;
/** Don't leave overlays pending forever if agent state never reaches listening. */
const TURN_END_TIMEOUT_MS = 45_000;

function isAgentTurnEnded(state: AgentState): boolean {
	return state === "listening" || state === "idle";
}

/**
 * Schedules a callback to run only after the voice agent finishes its current
 * turn (leaves thinking/speaking and reaches listening/idle).
 *
 * RPC handlers must return immediately — awaiting playout inside the RPC would
 * deadlock because speech often starts only after the tool result returns.
 * Call `runAfterAgentTurnEnd` from the RPC, then return `{ started: true }`.
 */
export function useDeferUntilAgentTurnEnd() {
	const { state } = useVoiceAssistant();
	const stateRef = useRef(state);
	stateRef.current = state;

	const pendingRef = useRef<(() => void) | null>(null);
	const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearTimers = useCallback(() => {
		if (settleTimerRef.current) {
			clearTimeout(settleTimerRef.current);
			settleTimerRef.current = null;
		}
		if (timeoutTimerRef.current) {
			clearTimeout(timeoutTimerRef.current);
			timeoutTimerRef.current = null;
		}
	}, []);

	const flushPending = useCallback(() => {
		const action = pendingRef.current;
		if (!action) {
			return;
		}
		pendingRef.current = null;
		clearTimers();
		action();
	}, [clearTimers]);

	const runAfterAgentTurnEnd = useCallback(
		(action: () => void) => {
			clearTimers();
			pendingRef.current = action;

			if (isAgentTurnEnded(stateRef.current)) {
				settleTimerRef.current = setTimeout(() => {
					settleTimerRef.current = null;
					flushPending();
				}, TURN_END_SETTLE_MS);
				return;
			}

			timeoutTimerRef.current = setTimeout(() => {
				timeoutTimerRef.current = null;
				flushPending();
			}, TURN_END_TIMEOUT_MS);
		},
		[clearTimers, flushPending],
	);

	useEffect(() => {
		if (!pendingRef.current) {
			return;
		}
		if (!isAgentTurnEnded(state)) {
			if (settleTimerRef.current) {
				clearTimeout(settleTimerRef.current);
				settleTimerRef.current = null;
			}
			return;
		}
		if (settleTimerRef.current) {
			return;
		}
		settleTimerRef.current = setTimeout(() => {
			settleTimerRef.current = null;
			flushPending();
		}, TURN_END_SETTLE_MS);
		return () => {
			if (settleTimerRef.current) {
				clearTimeout(settleTimerRef.current);
				settleTimerRef.current = null;
			}
		};
	}, [flushPending, state]);

	useEffect(() => {
		return () => {
			pendingRef.current = null;
			clearTimers();
		};
	}, [clearTimers]);

	return runAfterAgentTurnEnd;
}
