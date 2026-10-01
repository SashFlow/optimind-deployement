"use client";

import { useSessionContext } from "@livekit/components-react";
import { createContext, type ReactNode, useContext } from "react";
import { IdCaptureOverlay } from "@/components/saas/agents/proctoring/id-capture-overlay";
import { type ProctoringState, useProctoring } from "@/hooks/useProctoring";
import type { ProctoringConfigOverrides } from "@/lib/proctoring/config";

const ProctoringContext = createContext<ProctoringState | null>(null);

/** `null` outside a `ProctoringProvider`, so shared components can render without proctoring. */
export function useProctoringContext() {
	return useContext(ProctoringContext);
}

interface ProctoringProviderProps {
	config?: ProctoringConfigOverrides;
	children: ReactNode;
}

export function ProctoringProvider({
	config,
	children,
}: ProctoringProviderProps) {
	const { isConnected } = useSessionContext();
	const proctoring = useProctoring({ enabled: isConnected, config });

	return (
		<ProctoringContext.Provider value={proctoring}>
			{children}
			<IdCaptureOverlay />
		</ProctoringContext.Provider>
	);
}
