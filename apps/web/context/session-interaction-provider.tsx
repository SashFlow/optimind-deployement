"use client";

import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { createContext, type ReactNode, useContext } from "react";
import { AadhaarOtpInputPopover } from "@/components/saas/agents/session/aadhaar-otp-input-popover";
import { OtpInputPopover } from "@/components/saas/agents/session/otp-input-popover";
import {
	type AadhaarOtpInputState,
	useAadhaarOtpInput,
} from "@/hooks/useAadhaarOtpInput";
import { type OtpInputState, useOtpInput } from "@/hooks/useOtpInput";

export type SessionInteractionContextValue = {
	otp: OtpInputState;
	aadhaarOtp: AadhaarOtpInputState;
};

const SessionInteractionContext =
	createContext<SessionInteractionContextValue | null>(null);

/** `null` outside a `SessionInteractionProvider`. */
export function useSessionInteractionContext() {
	return useContext(SessionInteractionContext);
}

interface SessionInteractionProviderProps {
	otpInputEnabled?: boolean;
	sessionId?: string | null;
	participantToken?: string | null;
	children: ReactNode;
}

/**
 * Hosts session UI overlays that are opened by agent RPCs but are not part of
 * proctoring (OTP input and Aadhaar OKYC OTP).
 */
export function SessionInteractionProvider({
	otpInputEnabled = false,
	sessionId = null,
	participantToken = null,
	children,
}: SessionInteractionProviderProps) {
	const connectionState = useConnectionState();
	const isConnected = connectionState === ConnectionState.Connected;
	const enabled = otpInputEnabled && isConnected;
	const otp = useOtpInput({ enabled });
	const aadhaarOtp = useAadhaarOtpInput({
		enabled,
		sessionId,
		participantToken,
	});

	return (
		<SessionInteractionContext.Provider value={{ otp, aadhaarOtp }}>
			{children}
			<OtpInputPopover />
			<AadhaarOtpInputPopover />
		</SessionInteractionContext.Provider>
	);
}
