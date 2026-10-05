"use client";

import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { FaceCaptureOverlay } from "@/components/saas/agents/proctoring/face-capture-overlay";
import { IdCaptureOverlay } from "@/components/saas/agents/proctoring/id-capture-overlay";
import { type ProctoringState, useProctoring } from "@/hooks/useProctoring";
import type { ProctoringConfigOverrides } from "@/lib/proctoring/config";
import type { FaceCaptureResult } from "@/lib/proctoring/faceCapture";
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
	/**
	 * Continuous proctoring / violation detection. Independent of ID and face capture.
	 */
	enabled?: boolean;
	proactiveResponse?: boolean;
	/**
	 * Registers ID capture RPC. Works with or without proctoring enabled.
	 */
	idVerification?: boolean;
	/**
	 * Registers face capture RPC. Works with or without proctoring enabled.
	 */
	faceVerification?: boolean;
	config?: ProctoringConfigOverrides;
	onIdCapture?: (result: IdCaptureResult) => Promise<unknown> | unknown;
	onFaceCapture?: (result: FaceCaptureResult) => Promise<unknown> | unknown;
	children: ReactNode;
}

export function ProctoringProvider({
	enabled = false,
	proactiveResponse = true,
	idVerification = false,
	faceVerification = false,
	config,
	onIdCapture,
	onFaceCapture,
	children,
}: ProctoringProviderProps) {
	const connectionState = useConnectionState();
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
		proctoringEnabled: enabled && isConnected,
		idVerification: idVerification && isConnected,
		faceVerification: faceVerification && isConnected,
		config: mergedConfig,
		onIdCapture,
		onFaceCapture,
	});

	return (
		<ProctoringContext.Provider value={proctoring}>
			{children}
			<IdCaptureOverlay />
			<FaceCaptureOverlay />
		</ProctoringContext.Provider>
	);
}
