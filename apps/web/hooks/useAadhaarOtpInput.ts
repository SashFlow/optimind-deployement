import { useRoomContext } from "@livekit/components-react";
import { orpcClient } from "@shared/lib/orpc-client";
import { ParticipantKind, type Room } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** RPC the agent can call on the candidate to open Aadhaar OTP input. */
export const START_AADHAAR_OTP_INPUT_RPC = "start_aadhaar_otp_input";

const DEFAULT_OTP_LENGTH = 6;
const RESEND_COOLDOWN_MS = 30_000;

export interface AadhaarOtpInputOptions {
	length: number;
	hint: string | null;
	aadhaarNumber: string;
}

interface AgentContext {
	state: string;
	action: "say" | "generate_reply" | "silent";
	type: "aadhaar_otp_verified" | "aadhaar_otp_failed";
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

function parseStartPayload(payload: string): AadhaarOtpInputOptions | null {
	if (!payload) {
		return null;
	}
	try {
		const parsed = JSON.parse(payload) as {
			length?: unknown;
			hint?: unknown;
			aadhaar_number?: unknown;
			aadhaarNumber?: unknown;
		};
		const rawAadhaar =
			typeof parsed.aadhaar_number === "string"
				? parsed.aadhaar_number
				: typeof parsed.aadhaarNumber === "string"
					? parsed.aadhaarNumber
					: "";
		const aadhaarNumber = rawAadhaar.replace(/\s+/g, "").trim();
		if (!/^\d{12}$/.test(aadhaarNumber)) {
			return null;
		}
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
		return { length, hint, aadhaarNumber };
	} catch {
		return null;
	}
}

function orpcErrorMessage(error: unknown, fallback: string): string {
	if (error && typeof error === "object") {
		const record = error as {
			message?: unknown;
			data?: { message?: unknown };
		};
		if (typeof record.message === "string" && record.message.trim()) {
			return record.message.trim();
		}
		if (
			typeof record.data?.message === "string" &&
			record.data.message.trim()
		) {
			return record.data.message.trim();
		}
	}
	if (error instanceof Error && error.message.trim()) {
		return error.message.trim();
	}
	return fallback;
}

interface UseAadhaarOtpInputOptions {
	enabled?: boolean;
	sessionId?: string | null;
	participantToken?: string | null;
}

export function useAadhaarOtpInput({
	enabled = false,
	sessionId = null,
	participantToken = null,
}: UseAadhaarOtpInputOptions = {}) {
	const room = useRoomContext();
	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState<AadhaarOtpInputOptions>({
		length: DEFAULT_OTP_LENGTH,
		hint: null,
		aadhaarNumber: "",
	});
	const [code, setCode] = useState("");
	const [requesting, setRequesting] = useState(false);
	const [requestError, setRequestError] = useState<string | null>(null);
	const [otpRequested, setOtpRequested] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [resending, setResending] = useState(false);
	const [resendAvailableAt, setResendAvailableAt] = useState(0);
	const [now, setNow] = useState(() => Date.now());

	const submitInFlightRef = useRef(false);
	const resendInFlightRef = useRef(false);
	const requestInFlightRef = useRef(false);
	const sessionIdRef = useRef(sessionId);
	const participantTokenRef = useRef(participantToken);
	sessionIdRef.current = sessionId;
	participantTokenRef.current = participantToken;

	useEffect(() => {
		if (resendAvailableAt <= Date.now()) {
			return;
		}
		const timer = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(timer);
	}, [resendAvailableAt]);

	const requestOtp = useCallback(async (aadhaarNumber: string) => {
		const sid = sessionIdRef.current;
		const token = participantTokenRef.current;
		if (!sid || !token) {
			throw new Error("Session credentials are not available");
		}
		await orpcClient.sessions.requestAadhaarOtp({
			id: sid,
			aadhaar_number: aadhaarNumber,
			participantToken: token,
		});
	}, []);

	const openAadhaarOtpInput = useCallback(
		(next: AadhaarOtpInputOptions) => {
			if (submitInFlightRef.current) {
				return;
			}
			submitInFlightRef.current = false;
			resendInFlightRef.current = false;
			requestInFlightRef.current = false;
			setOptions(next);
			setCode("");
			setSubmitting(false);
			setResending(false);
			setRequestError(null);
			setOtpRequested(false);
			setResendAvailableAt(0);
			setOpen(true);
			setRequesting(true);
			requestInFlightRef.current = true;

			void (async () => {
				try {
					await requestOtp(next.aadhaarNumber);
					setOtpRequested(true);
					setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
					toast.success("Aadhaar OTP sent");
				} catch (error) {
					console.error("Aadhaar OTP request failed", error);
					const detail = orpcErrorMessage(
						error,
						"Could not request Aadhaar OTP.",
					);
					setRequestError(detail);
					toast.error(detail);
				} finally {
					requestInFlightRef.current = false;
					setRequesting(false);
				}
			})();
		},
		[requestOtp],
	);

	const dismiss = useCallback(() => {
		submitInFlightRef.current = false;
		resendInFlightRef.current = false;
		requestInFlightRef.current = false;
		setOpen(false);
		setCode("");
		setSubmitting(false);
		setResending(false);
		setRequesting(false);
		setRequestError(null);
		setOtpRequested(false);
	}, []);

	const submit = useCallback(async () => {
		if (
			code.length !== options.length ||
			submitInFlightRef.current ||
			!otpRequested ||
			requesting
		) {
			return;
		}
		const sid = sessionIdRef.current;
		const token = participantTokenRef.current;
		if (!sid || !token) {
			toast.error("Session credentials are not available");
			return;
		}

		submitInFlightRef.current = true;
		setSubmitting(true);
		try {
			const result = await orpcClient.sessions.verifyAadhaarOtp({
				id: sid,
				otp: code,
				participantToken: token,
			});

			if (result.verified) {
				try {
					await sendContext(room, {
						state: "Aadhaar OTP verification succeeded. The candidate's Aadhaar has been verified. You may continue the conversation.",
						action: "generate_reply",
						type: "aadhaar_otp_verified",
						details: {
							verifiedAt: Date.now(),
							aadhaarLast4: options.aadhaarNumber.slice(-4),
						},
					});
				} catch (error) {
					console.error(
						"add_context after Aadhaar verify failed",
						error,
					);
				}
				toast.success("Aadhaar verified");
				dismiss();
				return;
			}

			try {
				await sendContext(room, {
					state: "Aadhaar OTP verification failed. Ask the candidate to try again or request a new OTP.",
					action: "generate_reply",
					type: "aadhaar_otp_failed",
					details: {
						failedAt: Date.now(),
						code: result.code ?? null,
					},
				});
			} catch (error) {
				console.error(
					"add_context after Aadhaar verify failure failed",
					error,
				);
			}
			toast.error("Invalid Aadhaar OTP. Please try again.");
			setCode("");
		} catch (error) {
			console.error("Aadhaar OTP verify failed", error);
			const detail = orpcErrorMessage(
				error,
				"Could not verify the code. Please try again.",
			);
			toast.error(detail);
			try {
				await sendContext(room, {
					state: "Aadhaar OTP verification failed. Ask the candidate to try again or request a new OTP.",
					action: "generate_reply",
					type: "aadhaar_otp_failed",
					details: {
						failedAt: Date.now(),
						error: detail,
					},
				});
			} catch (rpcError) {
				console.error(
					"add_context after Aadhaar verify error failed",
					rpcError,
				);
			}
		} finally {
			submitInFlightRef.current = false;
			setSubmitting(false);
		}
	}, [
		code,
		dismiss,
		options.aadhaarNumber,
		options.length,
		otpRequested,
		requesting,
		room,
	]);

	const resend = useCallback(async () => {
		const nowMs = Date.now();
		if (
			resendInFlightRef.current ||
			requestInFlightRef.current ||
			nowMs < resendAvailableAt ||
			!options.aadhaarNumber
		) {
			return;
		}
		resendInFlightRef.current = true;
		setResending(true);
		setRequestError(null);
		try {
			await requestOtp(options.aadhaarNumber);
			setOtpRequested(true);
			setCode("");
			setResendAvailableAt(nowMs + RESEND_COOLDOWN_MS);
			toast.success("Aadhaar OTP resent");
		} catch (error) {
			console.error("Aadhaar OTP resend failed", error);
			const detail = orpcErrorMessage(
				error,
				"Could not resend Aadhaar OTP.",
			);
			setRequestError(detail);
			toast.error(detail);
		} finally {
			resendInFlightRef.current = false;
			setResending(false);
		}
	}, [options.aadhaarNumber, requestOtp, resendAvailableAt]);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		try {
			room.registerRpcMethod(
				START_AADHAAR_OTP_INPUT_RPC,
				async (data) => {
					const parsed = parseStartPayload(data.payload);
					if (!parsed) {
						return JSON.stringify({
							started: false,
							error: "aadhaar_number required (12 digits)",
						});
					}
					openAadhaarOtpInput(parsed);
					return JSON.stringify({ started: true });
				},
			);
		} catch (error) {
			console.warn(
				`${START_AADHAAR_OTP_INPUT_RPC} RPC already registered`,
				error,
			);
			return;
		}
		return () => room.unregisterRpcMethod(START_AADHAAR_OTP_INPUT_RPC);
	}, [enabled, openAadhaarOtpInput, room]);

	const resendCooldownSeconds = Math.max(
		0,
		Math.ceil((resendAvailableAt - now) / 1000),
	);

	return {
		open,
		options,
		code,
		setCode,
		requesting,
		requestError,
		otpRequested,
		submitting,
		resending,
		resendCooldownSeconds,
		canResend:
			resendCooldownSeconds === 0 &&
			!resending &&
			!requesting &&
			Boolean(options.aadhaarNumber),
		dismiss,
		submit,
		resend,
	};
}

export type AadhaarOtpInputState = ReturnType<typeof useAadhaarOtpInput>;
