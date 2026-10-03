"use client";

import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { createContext, type ReactNode, useContext } from "react";
import { OtpInputPopover } from "@/components/saas/agents/session/otp-input-popover";
import { type OtpInputState, useOtpInput } from "@/hooks/useOtpInput";

const SessionInteractionContext = createContext<OtpInputState | null>(null);

/** `null` outside a `SessionInteractionProvider`. */
export function useSessionInteractionContext() {
	return useContext(SessionInteractionContext);
}

interface SessionInteractionProviderProps {
	otpInputEnabled?: boolean;
	children: ReactNode;
}

/**
 * Hosts session UI overlays that are opened by agent RPCs but are not part of
 * proctoring (currently OTP input).
 */
export function SessionInteractionProvider({
	otpInputEnabled = false,
	children,
}: SessionInteractionProviderProps) {
	const connectionState = useConnectionState();
	const isConnected = connectionState === ConnectionState.Connected;
	const otp = useOtpInput({
		enabled: otpInputEnabled && isConnected,
	});

	return (
		<SessionInteractionContext.Provider value={otp}>
			{children}
			<OtpInputPopover />
		</SessionInteractionContext.Provider>
	);
}
