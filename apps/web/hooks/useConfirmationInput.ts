"use client";

import { useRoomContext } from "@livekit/components-react";
import { ParticipantKind, type Room } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** RPC the agent can call on the candidate to open the confirmation popover. */
export const START_CONFIRMATION_RPC = "start_confirmation";

const DEFAULT_ACCEPT_LABEL = "I accept";

export interface ConfirmationInputOptions {
	prompt: string;
	acceptLabel: string;
}

interface AgentContext {
	state: string;
	action: "say" | "generate_reply" | "silent";
	type: "confirmation_accepted" | "confirmation_declined";
	details?: Record<string, unknown>;
}

async function sendContext(room: Room, context: AgentContext) {
	const agent = Array.from(room.remoteParticipants.values()).find(
		(p) => p.kind === ParticipantKind.AGENT,
	);
	if (!agent) {
		throw new Error("Agent is not connected");
	}

	try {
		await room.localParticipant.performRpc({
			destinationIdentity: agent.identity,
			method: "add_context",
			payload: JSON.stringify(context),
		});
	} catch (error) {
		console.error("add_context RPC failed", error);
		throw error;
	}
}

function parseStartPayload(payload: string): ConfirmationInputOptions {
	if (!payload) {
		return {
			prompt: "Please confirm to continue.",
			acceptLabel: DEFAULT_ACCEPT_LABEL,
		};
	}
	try {
		const parsed = JSON.parse(payload) as {
			prompt?: unknown;
			acceptLabel?: unknown;
			accept_label?: unknown;
		};
		const prompt =
			typeof parsed.prompt === "string" && parsed.prompt.trim()
				? parsed.prompt.trim()
				: "Please confirm to continue.";
		const rawLabel =
			typeof parsed.acceptLabel === "string"
				? parsed.acceptLabel
				: typeof parsed.accept_label === "string"
					? parsed.accept_label
					: DEFAULT_ACCEPT_LABEL;
		const acceptLabel = rawLabel.trim() || DEFAULT_ACCEPT_LABEL;
		return { prompt, acceptLabel };
	} catch {
		return {
			prompt: "Please confirm to continue.",
			acceptLabel: DEFAULT_ACCEPT_LABEL,
		};
	}
}

interface UseConfirmationInputOptions {
	enabled?: boolean;
}

export function useConfirmationInput({
	enabled = false,
}: UseConfirmationInputOptions = {}) {
	const room = useRoomContext();
	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState<ConfirmationInputOptions>({
		prompt: "Please confirm to continue.",
		acceptLabel: DEFAULT_ACCEPT_LABEL,
	});
	const [checked, setChecked] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const submitInFlightRef = useRef(false);
	const contextSentRef = useRef(false);

	const openConfirmation = useCallback((next: ConfirmationInputOptions) => {
		if (submitInFlightRef.current) {
			return;
		}
		submitInFlightRef.current = false;
		contextSentRef.current = false;
		setOptions(next);
		setChecked(false);
		setSubmitting(false);
		setOpen(true);
	}, []);

	const dismiss = useCallback(() => {
		submitInFlightRef.current = false;
		setOpen(false);
		setChecked(false);
		setSubmitting(false);
	}, []);

	const accept = useCallback(async () => {
		if (!checked || submitInFlightRef.current || contextSentRef.current) {
			return;
		}
		submitInFlightRef.current = true;
		contextSentRef.current = true;
		setSubmitting(true);
		try {
			await sendContext(room, {
				state: "The candidate accepted the on-screen confirmation. Continue with the next step.",
				action: "generate_reply",
				type: "confirmation_accepted",
				details: {
					prompt: options.prompt,
					acceptLabel: options.acceptLabel,
					acceptedAt: Date.now(),
				},
			});
			toast.success("Confirmation recorded");
			dismiss();
		} catch (error) {
			console.error("Confirmation accept failed", error);
			contextSentRef.current = false;
			const detail =
				error instanceof Error && error.message.trim()
					? error.message.trim()
					: "Please try again.";
			toast.error(`Could not submit confirmation: ${detail}`);
			submitInFlightRef.current = false;
			setSubmitting(false);
		}
	}, [checked, dismiss, options.acceptLabel, options.prompt, room]);

	const decline = useCallback(async () => {
		if (submitInFlightRef.current || contextSentRef.current) {
			return;
		}
		submitInFlightRef.current = true;
		contextSentRef.current = true;
		setSubmitting(true);
		try {
			await sendContext(room, {
				state: "The candidate declined the on-screen confirmation. Ask whether they want to continue or end the session.",
				action: "generate_reply",
				type: "confirmation_declined",
				details: {
					prompt: options.prompt,
					declinedAt: Date.now(),
				},
			});
			dismiss();
		} catch (error) {
			console.error("Confirmation decline failed", error);
			contextSentRef.current = false;
			toast.error("Could not send your response. Please try again.");
			submitInFlightRef.current = false;
			setSubmitting(false);
		}
	}, [dismiss, options.prompt, room]);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		try {
			room.registerRpcMethod(START_CONFIRMATION_RPC, async (data) => {
				openConfirmation(parseStartPayload(data.payload));
				return JSON.stringify({ started: true });
			});
		} catch (error) {
			console.warn(
				`${START_CONFIRMATION_RPC} RPC already registered`,
				error,
			);
			return;
		}
		return () => room.unregisterRpcMethod(START_CONFIRMATION_RPC);
	}, [enabled, openConfirmation, room]);

	return {
		open,
		options,
		checked,
		setChecked,
		submitting,
		dismiss,
		accept,
		decline,
	};
}

export type ConfirmationInputState = ReturnType<typeof useConfirmationInput>;
