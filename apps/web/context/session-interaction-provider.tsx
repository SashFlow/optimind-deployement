"use client";

import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { createContext, type ReactNode, useContext } from "react";
import { AadhaarOtpInputPopover } from "@/components/saas/agents/session/aadhaar-otp-input-popover";
import { ConfirmationPopover } from "@/components/saas/agents/session/confirmation-popover";
import { OtpInputPopover } from "@/components/saas/agents/session/otp-input-popover";
import {
	type AadhaarOtpInputState,
	useAadhaarOtpInput,
} from "@/hooks/useAadhaarOtpInput";
import {
	type ConfirmationInputState,
	useConfirmationInput,
} from "@/hooks/useConfirmationInput";
import { type OtpInputState, useOtpInput } from "@/hooks/useOtpInput";

export type SessionInteractionContextValue = {
	otp: OtpInputState;
	aadhaarOtp: AadhaarOtpInputState;
	confirmation: ConfirmationInputState;
};

const SessionInteractionContext =
	createContext<SessionInteractionContextValue | null>(null);

/** `null` outside a `SessionInteractionProvider`. */
export function useSessionInteractionContext() {
	return useContext(SessionInteractionContext);
}

interface SessionInteractionProviderProps {
	otpInputEnabled?: boolean;
	confirmationInputEnabled?: boolean;
	sessionId?: string | null;
	participantToken?: string | null;
	children: ReactNode;
}

/**
 * Hosts session UI overlays that are opened by agent RPCs but are not part of
 * proctoring (OTP input, Aadhaar OKYC OTP, answer confirmation).
 */
export function SessionInteractionProvider({
	otpInputEnabled = false,
	confirmationInputEnabled = false,
	sessionId = null,
	participantToken = null,
	children,
}: SessionInteractionProviderProps) {
	const connectionState = useConnectionState();
	const isConnected = connectionState === ConnectionState.Connected;
	const otpEnabled = otpInputEnabled && isConnected;
	const confirmationEnabled = confirmationInputEnabled && isConnected;
	const otp = useOtpInput({ enabled: otpEnabled });
	const aadhaarOtp = useAadhaarOtpInput({
		enabled: otpEnabled,
		sessionId,
		participantToken,
	});
	const confirmation = useConfirmationInput({
		enabled: confirmationEnabled,
	});

	return (
		<SessionInteractionContext.Provider
			value={{ otp, aadhaarOtp, confirmation }}
		>
			{children}
			<OtpInputPopover />
			<AadhaarOtpInputPopover />
			<ConfirmationPopover />
		</SessionInteractionContext.Provider>
	);
}
