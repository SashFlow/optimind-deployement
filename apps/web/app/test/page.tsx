"use client";

import { useCallback, useState } from "react";
import AvatarVoiceAgent from "@/components/test/AvatarVoiceAgent";
import { orpc } from "@/components/shared/lib/orpc-query-utils";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
interface ConnectionInfo {
	sessionId: string;
	roomName: string;
	serverUrl: string;
	participantToken: string;
	phoneNumber: null | string;
	spatialRealAppId: string;
}

export default function HomePage() {
	const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
	const [isConnecting, setIsConnecting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const startTrialSession = useMutation(
		orpc.sessions.startTrialSession.mutationOptions({
			onSuccess: (data) => {
				if (!data.participantToken || !data.serverUrl) {
					toast.error("Could not start web session");
					setIsConnecting(false);
					return;
				}

				setConnectionInfo({
					participantToken: data.participantToken,
					serverUrl: data.serverUrl,
					spatialRealAppId: data.spatialRealAppId ?? "",
					sessionId: data.sessionId,
					roomName: data.roomName,
					phoneNumber: data.phoneNumber ?? null,
				});

				setIsConnecting(false);
			},

			onError: (error) => {
				setIsConnecting(false);
				toast.error(error.message || "Could not start session");
			},
		}),
	);

	const connect = useCallback(() => {
		startTrialSession.mutate({
			token: "f45bz5yv7mazc3wabb0c1tqh",
		});
	}, [startTrialSession]);

	const disconnect = useCallback(() => {
		setConnectionInfo(null);
	}, []);

	if (connectionInfo) {
		return (
			<AvatarVoiceAgent
				token={connectionInfo.participantToken}
				serverUrl={connectionInfo.serverUrl}
				roomName={connectionInfo.roomName}
				onDisconnect={disconnect}
			/>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h1 className="mb-4 text-4xl font-bold">LiveKit Agents x Spatialreal</h1>
				<p className="mb-8 text-slate-400">Connect to chat with AI</p>

				{error && (
					<div className="mb-4 rounded border border-red-500 bg-red-900/50 px-4 py-3 text-red-200">
						{error}
					</div>
				)}

				<button
					onClick={() => {
						void connect();
					}}
					disabled={isConnecting}
					className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors
                     hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
				>
					{isConnecting ? "Connecting..." : "Connect"}
				</button>
			</div>
		</div>
	);
}
