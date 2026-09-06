"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { PlusIcon, Trash2Icon } from "lucide-react";
import type { AgentConfigDocument } from "@/lib/agent-config";

type McpConfig = AgentConfigDocument["mcp"];
type McpServer = McpConfig["servers"][number];

function createEmptyServer(): McpServer {
	return {
		name: "",
		url: "",
		auth_token: "",
		tool_ids: [],
	};
}

type McpServersEditorProps = {
	mcp: McpConfig;
	onChange: (mcp: McpConfig) => void;
};

export function McpServersEditor({ mcp, onChange }: McpServersEditorProps) {
	function updateServer(index: number, patch: Partial<McpServer>) {
		onChange({
			...mcp,
			servers: mcp.servers.map((server, i) =>
				i === index ? { ...server, ...patch } : server,
			),
		});
	}

	function addServer() {
		onChange({
			...mcp,
			enabled: true,
			servers: [...mcp.servers, createEmptyServer()],
		});
	}

	function removeServer(index: number) {
		onChange({
			...mcp,
			servers: mcp.servers.filter((_, i) => i !== index),
		});
	}

	if (mcp.servers.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background px-4 py-8 text-center">
				<p className="text-sm font-medium">No MCP servers configured</p>
				<p className="mt-1 max-w-sm text-xs text-muted-foreground">
					Add a server URL ending in{" "}
					<code className="text-xs">/mcp</code> or{" "}
					<code className="text-xs">/sse</code>.
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-4"
					onClick={addServer}
				>
					<PlusIcon />
					Add server
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{mcp.servers.map((server, index) => (
				<div
					key={index}
					className="space-y-4 rounded-lg border bg-background p-4"
				>
					<div className="flex items-start justify-between gap-3">
						<p className="text-sm font-medium">
							{server.name.trim() || `Server ${index + 1}`}
						</p>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={() => removeServer(index)}
							aria-label="Remove server"
							className="text-muted-foreground"
						>
							<Trash2Icon />
						</Button>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label className="text-xs">Name</Label>
							<Input
								value={server.name}
								onChange={(e) =>
									updateServer(index, {
										name: e.target.value,
									})
								}
								placeholder="my-mcp-server"
								className="bg-background text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label className="text-xs">URL</Label>
							<Input
								value={server.url}
								onChange={(e) =>
									updateServer(index, { url: e.target.value })
								}
								placeholder="https://example.com/mcp"
								className="bg-background text-sm"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label className="text-xs">Auth token</Label>
						<Input
							value={server.auth_token}
							onChange={(e) =>
								updateServer(index, {
									auth_token: e.target.value,
								})
							}
							type="password"
							placeholder="Bearer token (optional)"
							className="bg-background text-sm"
						/>
						<p className="text-xs text-muted-foreground">
							Sent as an Authorization header when connecting to
							the server.
						</p>
					</div>

					<div className="space-y-2">
						<Label className="text-xs">Allowed tools</Label>
						<Input
							value={server.tool_ids.join(", ")}
							onChange={(e) =>
								updateServer(index, {
									tool_ids: e.target.value
										.split(",")
										.map((tool) => tool.trim())
										.filter(Boolean),
								})
							}
							placeholder="search_products, get_product_details"
							className="bg-background text-sm"
						/>
						<p className="text-xs text-muted-foreground">
							Leave empty to expose all tools from the server.
						</p>
					</div>
				</div>
			))}

			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={addServer}
			>
				<PlusIcon />
				Add server
			</Button>
		</div>
	);
}
