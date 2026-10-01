"use client";

import { Button } from "@repo/ui/button";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

function absoluteUrl(path: string) {
	if (typeof window === "undefined") {
		return path;
	}
	try {
		return new URL(path, window.location.origin).toString();
	} catch {
		return path;
	}
}

async function copyText(value: string, successMessage: string) {
	try {
		await navigator.clipboard.writeText(value);
		toast.success(successMessage);
	} catch {
		toast.error("Could not copy");
	}
}

export function AgentEmbedPanel({ agentId }: { agentId: string }) {
	const queryClient = useQueryClient();
	const [copied, setCopied] = useState<"url" | "iframe" | null>(null);
	const provisionStarted = useRef(false);

	const agentQuery = useQuery(
		orpc.agents.get.queryOptions({
			input: { id: agentId },
		}),
	);

	const agentKey = orpc.agents.get.key({ input: { id: agentId } });

	const ensureEmbedMutation = useMutation(
		orpc.agents.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: agentKey });
			},
			onError: (error) => {
				provisionStarted.current = false;
				toast.error(error.message || "Failed to provision embed link");
			},
		}),
	);

	const agent = agentQuery.data?.agent;
	const token = agent?.token ?? null;
	const needsProvision =
		Boolean(agent) && (!token || !agent?.embedEnabled);

	useEffect(() => {
		if (!needsProvision || provisionStarted.current) {
			return;
		}
		provisionStarted.current = true;
		ensureEmbedMutation.mutate({
			id: agentId,
			ensureEmbedToken: true,
		});
	}, [agentId, needsProvision, ensureEmbedMutation.mutate]);

	const exampleUrl = useMemo(() => {
		if (!token) {
			return null;
		}
		const metadata = encodeURIComponent(
			JSON.stringify({ plan: "pro", source: "website" }),
		);
		return absoluteUrl(
			`/embed/${token}?name=Jane&id=cust_123&metadata=${metadata}`,
		);
	}, [token]);

	const iframeSnippet = useMemo(() => {
		if (!exampleUrl) {
			return null;
		}
		return `<iframe\n  src="${exampleUrl}"\n  width="100%"\n  height="700"\n  allow="microphone; camera; autoplay"\n  style="border:0;border-radius:12px"\n></iframe>`;
	}, [exampleUrl]);

	async function handleCopy(kind: "url" | "iframe", value: string) {
		await copyText(
			value,
			kind === "url" ? "Embed URL copied" : "Embed snippet copied",
		);
		setCopied(kind);
		window.setTimeout(() => setCopied(null), 1500);
	}

	if (agentQuery.isLoading || (needsProvision && !token)) {
		return (
			<p className="text-sm text-muted-foreground">
				Preparing embed link…
			</p>
		);
	}

	if (!exampleUrl || !iframeSnippet) {
		return (
			<p className="text-sm text-muted-foreground">
				Could not load embed details.
			</p>
		);
	}

	const hasPublishedVersion = Boolean(agent?.publishedVersionId);

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<div className="space-y-1">
				<h2 className="font-semibold text-lg">Embed</h2>
				<p className="text-sm text-muted-foreground">
					Embed the published agent on your site. Pass{" "}
					<code className="rounded bg-muted px-1 py-0.5 text-xs">
						name
					</code>
					,{" "}
					<code className="rounded bg-muted px-1 py-0.5 text-xs">
						id
					</code>
					, and{" "}
					<code className="rounded bg-muted px-1 py-0.5 text-xs">
						metadata
					</code>{" "}
					as query args to initialize or reuse an end user, then open
					the preview session.
				</p>
			</div>

			{!hasPublishedVersion ? (
				<p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
					Publish the agent before guests can start embed sessions.
				</p>
			) : null}

			<div className="space-y-2">
				<div className="flex items-center justify-between gap-2">
					<p className="text-sm font-medium">Embed URL</p>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => void handleCopy("url", exampleUrl)}
					>
						{copied === "url" ? (
							<CheckIcon className="size-3.5" />
						) : (
							<CopyIcon className="size-3.5" />
						)}
						Copy
					</Button>
				</div>
				<pre className="overflow-x-auto rounded-xl border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
					{exampleUrl}
				</pre>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between gap-2">
					<p className="text-sm font-medium">iframe snippet</p>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => void handleCopy("iframe", iframeSnippet)}
					>
						{copied === "iframe" ? (
							<CheckIcon className="size-3.5" />
						) : (
							<CopyIcon className="size-3.5" />
						)}
						Copy
					</Button>
				</div>
				<pre className="overflow-x-auto rounded-xl border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
					{iframeSnippet}
				</pre>
			</div>

			<div className="space-y-2 text-sm text-muted-foreground">
				<p className="font-medium text-foreground">Query arguments</p>
				<ul className="list-disc space-y-1 pl-5">
					<li>
						<span className="font-mono text-xs">name</span> —
						display name for the end user / participant
					</li>
					<li>
						<span className="font-mono text-xs">id</span> — stable
						external id; reuses the same end user across sessions
					</li>
					<li>
						<span className="font-mono text-xs">metadata</span> —
						URL-encoded JSON merged into contact metadata
					</li>
				</ul>
			</div>
		</div>
	);
}
