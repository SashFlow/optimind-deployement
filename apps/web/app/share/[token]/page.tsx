"use client";

import {
	LiveKitRoom,
	RoomAudioRenderer,
} from "@livekit/components-react";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PreviewSessionControls } from "@/components/saas/agents/preview/PreviewSessionControls";

export default function SharedTrialPage() {
	const params = useParams<{ token: string }>();
	const token = params.token;
	const [name, setName] = useState("");
	const [credentials, setCredentials] = useState<{
		token: string;
		serverUrl: string;
	} | null>(null);

	const trialQuery = useQuery(
		orpc.sessions.getTrialLink.queryOptions({
			input: { token },
		}),
	);
	const startMutation = useMutation(
		orpc.sessions.startTrialSession.mutationOptions({
			onSuccess: (data) => {
				setCredentials({
					token: data.participantToken,
					serverUrl: data.serverUrl,
				});
			},
			onError: (error) => {
				toast.error(error.message || "Could not start session");
			},
		}),
	);

	if (credentials) {
		return (
			<div className="flex min-h-screen flex-col bg-background">
				<LiveKitRoom
					token={credentials.token}
					serverUrl={credentials.serverUrl}
					connect
					audio
					video={false}
					className="flex min-h-screen flex-col"
				>
					<PreviewSessionControls
						agent={{
							id: trialQuery.data?.agent.id ?? "trial",
							name: trialQuery.data?.agent.name ?? "Agent",
						}}
						onEnd={() => setCredentials(null)}
					/>
					<RoomAudioRenderer />
				</LiveKitRoom>
			</div>
		);
	}

	if (trialQuery.isLoading) {
		return (
			<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
				<p className="text-sm text-muted-foreground">Loading trial link…</p>
			</div>
		);
	}

	if (trialQuery.isError || !trialQuery.data) {
		return (
			<div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6">
				<p className="text-sm text-muted-foreground">
					This shared link is invalid or expired.
				</p>
			</div>
		);
	}

	const { trial, agent } = trialQuery.data;
	const canStart = trial.available && !startMutation.isPending;

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-10">
			<div className="w-full space-y-6 rounded-3xl border bg-card p-6 shadow-sm ring-1 ring-black/5">
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">Shared demo link</p>
					<h1 className="font-semibold text-2xl tracking-tight">{agent.name}</h1>
					<p className="text-sm text-muted-foreground">{trial.label}</p>
				</div>

				<div className="grid gap-2 text-sm text-muted-foreground">
					<p>
						Sessions left:{" "}
						<span className="font-medium text-foreground">{trial.remaining}</span>
					</p>
					<p>
						Expires:{" "}
						<span className="font-medium text-foreground">
							{trial.expiresAt
								? new Date(trial.expiresAt).toLocaleDateString()
								: "Never"}
						</span>
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="guest-name">Your name (optional)</Label>
					<Input
						id="guest-name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Guest"
					/>
				</div>

				<Button
					type="button"
					className="w-full"
					loading={startMutation.isPending}
					disabled={!canStart}
					onClick={() =>
						startMutation.mutate({
							token,
							participantName: name.trim() || "Guest",
						})
					}
				>
					{trial.available ? "Start session" : "Link unavailable"}
				</Button>
			</div>
		</div>
	);
}
