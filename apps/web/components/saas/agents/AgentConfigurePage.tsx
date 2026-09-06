"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function AgentConfigurePage({ agentId }: { agentId: string }) {
	const queryClient = useQueryClient();
	const agentQuery = useQuery(
		orpc.agents.get.queryOptions({
			input: { id: agentId },
		}),
	);

	const agent = agentQuery.data?.agent;
	const draftConfig = (agent as { draftVersion?: { config?: Record<string, unknown> } } | undefined)
		?.draftVersion?.config;

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [systemPrompt, setSystemPrompt] = useState("");

	useEffect(() => {
		if (!agent) return;
		setName(agent.name);
		setDescription(agent.description ?? "");
		const prompt =
			typeof draftConfig?.systemPrompt === "string"
				? draftConfig.systemPrompt
				: typeof draftConfig?.prompt === "string"
					? draftConfig.prompt
					: "";
		setSystemPrompt(prompt);
	}, [agent, draftConfig]);

	const updateMutation = useMutation(
		orpc.agents.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.agents.get.key({ input: { id: agentId } }),
				});
				toast.success("Agent updated");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const configMutation = useMutation(
		orpc.agents.updateConfig.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.agents.get.key({ input: { id: agentId } }),
				});
				toast.success("Draft config saved");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const publishMutation = useMutation(
		orpc.agents.publish.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.agents.get.key({ input: { id: agentId } }),
				});
				toast.success("Agent published");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (agentQuery.isLoading) {
		return <p className="text-muted-foreground text-sm">Loading agent…</p>;
	}

	if (!agent) {
		return <p className="text-destructive text-sm">Agent not found.</p>;
	}

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_360px]">
			<section className="space-y-6 overflow-hidden rounded-3xl border bg-card p-6 shadow-sm ring-1 ring-black/5">
				<div>
					<h2 className="font-semibold text-xl tracking-tight">Configure</h2>
					<p className="text-muted-foreground text-sm">
						Update identity and draft prompt for this agent.
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="agent-name">Name</Label>
					<Input
						id="agent-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="agent-description">Description</Label>
					<Textarea
						id="agent-description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={3}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="agent-prompt">System prompt</Label>
					<Textarea
						id="agent-prompt"
						value={systemPrompt}
						onChange={(e) => setSystemPrompt(e.target.value)}
						rows={12}
						className="font-mono text-sm"
					/>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button
						className="rounded-full"
						loading={updateMutation.isPending}
						onClick={() =>
							updateMutation.mutate({
								id: agentId,
								name,
								description: description || null,
							})
						}
					>
						Save details
					</Button>
					<Button
						variant="outline"
						className="rounded-full"
						loading={configMutation.isPending}
						onClick={() =>
							configMutation.mutate({
								id: agentId,
								config: {
									knowledgeBaseIds: Array.isArray(
										draftConfig?.knowledgeBaseIds,
									)
										? (draftConfig.knowledgeBaseIds as string[])
										: [],
									...(draftConfig ?? {}),
									systemPrompt,
								},
							})
						}
					>
						Save draft config
					</Button>
					<Button
						variant="secondary"
						className="rounded-full"
						loading={publishMutation.isPending}
						onClick={() => publishMutation.mutate({ id: agentId })}
					>
						Publish
					</Button>
				</div>
			</section>

			<aside className="overflow-hidden rounded-3xl border bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
				<h3 className="font-semibold text-sm">Preview</h3>
				<p className="mt-2 text-muted-foreground text-sm">
					Live trial preview will attach here. For now, review the prompt and
					publish when ready.
				</p>
				<div className="mt-4 rounded-2xl bg-muted/50 p-4 text-sm">
					<p className="font-medium">{name || "Untitled agent"}</p>
					<p className="mt-2 whitespace-pre-wrap text-muted-foreground">
						{systemPrompt || "No system prompt set."}
					</p>
				</div>
			</aside>
		</div>
	);
}
