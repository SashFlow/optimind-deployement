"use client";

import {
	useConnectionState,
	useLocalParticipant,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { IdCaptureOverlay } from "@/components/saas/agents/proctoring/id-capture-overlay";
import { type ProctoringState, useProctoring } from "@/hooks/useProctoring";
import type { ProctoringConfigOverrides } from "@/lib/proctoring/config";
import type { IdCaptureResult } from "@/lib/proctoring/idCard";

const ProctoringContext = createContext<ProctoringState | null>(null);

/** `null` outside a `ProctoringProvider`, so shared components can render without proctoring. */
export function useProctoringContext() {
	return useContext(ProctoringContext);
}

function silentCheckOverrides(): ProctoringConfigOverrides {
	return {
		checks: {
			multiplePeople: { action: "silent" },
			additionalDevice: { action: "silent" },
			facePresent: { action: "silent" },
			gaze: { action: "silent" },
		},
	};
}

interface ProctoringProviderProps {
	enabled?: boolean;
	proactiveResponse?: boolean;
	idVerification?: boolean;
	config?: ProctoringConfigOverrides;
	onIdCapture?: (result: IdCaptureResult) => Promise<unknown> | unknown;
	children: ReactNode;
}

export function ProctoringProvider({
	enabled = true,
	proactiveResponse = true,
	idVerification = false,
	config,
	onIdCapture,
	children,
}: ProctoringProviderProps) {
	const connectionState = useConnectionState();
	const { isCameraEnabled } = useLocalParticipant();
	const isConnected = connectionState === ConnectionState.Connected;

	const mergedConfig = useMemo<ProctoringConfigOverrides | undefined>(() => {
		if (proactiveResponse) {
			return config;
		}
		const silent = silentCheckOverrides();
		if (!config) {
			return silent;
		}
		return {
			...config,
			...silent,
			checks: {
				...config.checks,
				...silent.checks,
				multiplePeople: {
					...config.checks?.multiplePeople,
					...silent.checks?.multiplePeople,
				},
				additionalDevice: {
					...config.checks?.additionalDevice,
					...silent.checks?.additionalDevice,
				},
				facePresent: {
					...config.checks?.facePresent,
					...silent.checks?.facePresent,
				},
				gaze: {
					...config.checks?.gaze,
					...silent.checks?.gaze,
				},
			},
		};
	}, [config, proactiveResponse]);

	const proctoring = useProctoring({
		enabled: enabled && isConnected,
		config: mergedConfig,
		onIdCapture,
	});

	const { startIdCapture, idCaptureStatus } = proctoring;
	const idStartedRef = useRef(false);
	useEffect(() => {
		if (!idVerification || !enabled || !isConnected || !isCameraEnabled) {
			return;
		}
		if (idStartedRef.current || idCaptureStatus !== "idle") {
			return;
		}
		idStartedRef.current = true;
		startIdCapture();
	}, [
		idVerification,
		enabled,
		isConnected,
		isCameraEnabled,
		idCaptureStatus,
		startIdCapture,
	]);

	return (
		<ProctoringContext.Provider value={proctoring}>
			{children}
			<IdCaptureOverlay />
		</ProctoringContext.Provider>
	);
}
