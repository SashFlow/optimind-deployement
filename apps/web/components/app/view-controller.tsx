"use client";

import { AgentSessionView_01 } from "@components/agents-ui/blocks/agent-session-view-01";
import { WelcomeView } from "@components/app/welcome-view";
import type { DemoPersona } from "@context/DemoProvider";
import { useSessionContext } from "@livekit/components-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import type { AppConfig } from "@/types/app-config";

const MotionWelcomeView = motion.create(WelcomeView);
const MotionSessionView = motion.create(AgentSessionView_01);

const VIEW_MOTION_PROPS = {
	variants: {
		visible: {
			opacity: 1,
		},
		hidden: {
			opacity: 0,
		},
	},
	initial: "hidden",
	animate: "visible",
	exit: "hidden",
	transition: {
		duration: 0.5,
		ease: "linear",
	},
} as const;

interface ViewControllerProps {
	appConfig: AppConfig;
	scenario: {
		sessionType: string[];
		title: string;
		description: string;
		highlights: string[];
		firstTimeGuidance: string[];
		suggestedQuestions: string[];
		url: string;
	};
	persona: DemoPersona | null;
	handleScenario?: () => void;
}

export function ViewController({
	appConfig,
	scenario,
	persona,
	handleScenario,
}: ViewControllerProps) {
	const { isConnected, start } = useSessionContext();
	const { resolvedTheme } = useTheme();

	const handleStartCall = async () => {
		if (handleScenario) {
			handleScenario();
		}
		await Promise.resolve(start());
	};

	return (
		<AnimatePresence mode="wait">
			{/* Welcome view */}
			{!isConnected && (
				<MotionWelcomeView
					key="welcome"
					{...VIEW_MOTION_PROPS}
					scenario={scenario}
					startButtonText={appConfig.startButtonText}
					onStartCall={handleStartCall}
					requireMediaSetup={appConfig.requireMediaSetupBeforeStart}
					showCameraPreview={appConfig.showWelcomeCameraPreview}
				/>
			)}
			{/* Session view */}
			{isConnected && (
				<MotionSessionView
					key="session-view"
					{...VIEW_MOTION_PROPS}
					persona={persona}
					supportsChatInput={appConfig.supportsChatInput}
					supportsVideoInput={appConfig.supportsVideoInput}
					supportsScreenShare={appConfig.supportsScreenShare}
					isPreConnectBufferEnabled={
						appConfig.isPreConnectBufferEnabled
					}
					audioVisualizerType={appConfig.audioVisualizerType}
					audioVisualizerColor={
						resolvedTheme === "dark"
							? appConfig.audioVisualizerColorDark
							: appConfig.audioVisualizerColor
					}
					audioVisualizerColorShift={
						appConfig.audioVisualizerColorShift
					}
					audioVisualizerBarCount={appConfig.audioVisualizerBarCount}
					audioVisualizerGridRowCount={
						appConfig.audioVisualizerGridRowCount
					}
					audioVisualizerGridColumnCount={
						appConfig.audioVisualizerGridColumnCount
					}
					audioVisualizerRadialBarCount={
						appConfig.audioVisualizerRadialBarCount
					}
					audioVisualizerRadialRadius={
						appConfig.audioVisualizerRadialRadius
					}
					audioVisualizerWaveLineWidth={
						appConfig.audioVisualizerWaveLineWidth
					}
					forceEnableCameraOnConnect={
						appConfig.forceEnableCameraOnSessionView
					}
					className="fixed inset-0"
				/>
			)}
		</AnimatePresence>
	);
}
