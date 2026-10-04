import { useRoomContext } from "@livekit/components-react";
import { ParticipantKind, type Room } from "livekit-client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/** RPC the agent can call on the candidate to open the OTP input popover. */
export const START_OTP_INPUT_RPC = "start_otp_input";

const DEFAULT_OTP_LENGTH = 6;
const RESEND_COOLDOWN_MS = 30_000;

export interface OtpInputOptions {
	length: number;
	hint: string | null;
}

interface AgentContext {
	state: string;
	action: "say" | "generate_reply" | "silent";
	type: "otp_submitted" | "otp_resend_requested";
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

function parseStartPayload(payload: string): OtpInputOptions {
	if (!payload) {
		return { length: DEFAULT_OTP_LENGTH, hint: null };
	}
	try {
		const parsed = JSON.parse(payload) as {
			length?: unknown;
			hint?: unknown;
		};
		const length =
			typeof parsed.length === "number" &&
			Number.isFinite(parsed.length) &&
			parsed.length >= 4 &&
			parsed.length <= 12
				? Math.floor(parsed.length)
				: DEFAULT_OTP_LENGTH;
		const hint =
			typeof parsed.hint === "string" && parsed.hint.trim()
				? parsed.hint.trim()
				: null;
		return { length, hint };
	} catch {
		return { length: DEFAULT_OTP_LENGTH, hint: null };
	}
}

interface UseOtpInputOptions {
	enabled?: boolean;
}

export function useOtpInput({ enabled = false }: UseOtpInputOptions = {}) {
	const room = useRoomContext();
	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState<OtpInputOptions>({
		length: DEFAULT_OTP_LENGTH,
		hint: null,
	});
	const [code, setCode] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [resending, setResending] = useState(false);
	const [resendAvailableAt, setResendAvailableAt] = useState(0);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (resendAvailableAt <= Date.now()) {
			return;
		}
		const timer = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(timer);
	}, [resendAvailableAt]);

	const openOtpInput = useCallback((next: OtpInputOptions) => {
		setOptions(next);
		setCode("");
		setSubmitting(false);
		setResending(false);
		setResendAvailableAt(0);
		setOpen(true);
	}, []);

	const dismiss = useCallback(() => {
		setOpen(false);
		setCode("");
		setSubmitting(false);
		setResending(false);
	}, []);

	const submit = useCallback(async () => {
		if (code.length !== options.length || submitting) {
			return;
		}
		setSubmitting(true);
		try {
			await sendContext(room, {
				state: "The candidate submitted a one-time password. Validate the code and continue.",
				action: "generate_reply",
				type: "otp_submitted",
				details: {
					code,
					length: options.length,
					submittedAt: Date.now(),
				},
			});
			toast.success("Code submitted");
			dismiss();
		} catch (error) {
			console.error("OTP submit failed", error);
			const detail =
				error instanceof Error && error.message.trim()
					? error.message.trim()
					: "Please try again.";
			toast.error(`Could not submit the code: ${detail}`);
			setSubmitting(false);
		}
	}, [code, dismiss, options.length, room, submitting]);

	const resend = useCallback(async () => {
		if (resending || Date.now() < resendAvailableAt) {
			return;
		}
		setResending(true);
		try {
			await sendContext(room, {
				state: "The candidate requested that the one-time password be resent.",
				action: "generate_reply",
				type: "otp_resend_requested",
				details: {
					requestedAt: Date.now(),
				},
			});
			setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
			toast.success("Resend requested");
		} catch (error) {
			console.error("OTP resend failed", error);
			toast.error("Could not request a resend. Please try again.");
		} finally {
			setResending(false);
		}
	}, [resendAvailableAt, resending, room]);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		try {
			room.registerRpcMethod(START_OTP_INPUT_RPC, async (data) => {
				openOtpInput(parseStartPayload(data.payload));
				return JSON.stringify({ started: true });
			});
		} catch (error) {
			console.warn(
				`${START_OTP_INPUT_RPC} RPC already registered`,
				error,
			);
			return;
		}
		return () => room.unregisterRpcMethod(START_OTP_INPUT_RPC);
	}, [enabled, openOtpInput, room]);

	const resendCooldownSeconds = Math.max(
		0,
		Math.ceil((resendAvailableAt - now) / 1000),
	);

	return {
		open,
		options,
		code,
		setCode,
		submitting,
		resending,
		resendCooldownSeconds,
		canResend: resendCooldownSeconds === 0 && !resending,
		dismiss,
		submit,
		resend,
	};
}

export type OtpInputState = ReturnType<typeof useOtpInput>;
