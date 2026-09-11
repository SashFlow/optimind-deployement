"use client";

import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { Textarea } from "@repo/ui/textarea";
import type { WorkflowNodeData } from "./WorkflowFlowNode";

export function WorkflowInspector({
	selected,
	onChange,
}: {
	selected: { id: string; data: WorkflowNodeData };
	onChange: (data: WorkflowNodeData) => void;
}) {
	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
			<section className="space-y-3">
				<div className="space-y-1">
					<Label>Label</Label>
					<Input
						value={selected.data.label ?? ""}
						onChange={(e) =>
							onChange({
								...selected.data,
								label: e.target.value,
							})
						}
					/>
				</div>
				<NodeConfigFields
					type={selected.data.type}
					config={selected.data.config}
					onChange={(config) =>
						onChange({ ...selected.data, config })
					}
				/>
			</section>
		</div>
	);
}

function NodeConfigFields({
	type,
	config,
	onChange,
}: {
	type: string;
	config: Record<string, unknown>;
	onChange: (config: Record<string, unknown>) => void;
}) {
	const set = (key: string, value: unknown) =>
		onChange({ ...config, [key]: value });

	if (type === "start.scheduled") {
		return (
			<div className="space-y-1">
				<Label>Cron</Label>
				<Input
					value={String(config.cron ?? "")}
					onChange={(e) => set("cron", e.target.value)}
					placeholder="0 * * * *"
				/>
			</div>
		);
	}

	if (type === "control.if") {
		return (
			<div className="space-y-1">
				<Label>Condition (true branch)</Label>
				<Input
					value={String(
						(Array.isArray(config.cases)
							? (
									config.cases as Array<{
										expression?: string;
									}>
								)[0]?.expression
							: config.condition) ?? "",
					)}
					onChange={(e) =>
						set("cases", [
							{ handle: "true", expression: e.target.value },
						])
					}
					placeholder="nodes.http_1.status == 200"
				/>
			</div>
		);
	}

	if (type === "control.loop") {
		return (
			<div className="space-y-2">
				<div className="space-y-1">
					<Label>Mode</Label>
					<Select
						value={String(config.mode ?? "forEach")}
						onValueChange={(v) => set("mode", v)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="forEach">forEach</SelectItem>
							<SelectItem value="count">count</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1">
					<Label>Items path</Label>
					<Input
						value={String(config.itemsPath ?? "")}
						onChange={(e) => set("itemsPath", e.target.value)}
						placeholder="nodes.http_1.body.items"
					/>
				</div>
				<div className="space-y-1">
					<Label>Max iterations</Label>
					<Input
						type="number"
						value={String(config.maxIterations ?? 100)}
						onChange={(e) =>
							set("maxIterations", Number(e.target.value))
						}
					/>
				</div>
			</div>
		);
	}

	if (type === "http.request") {
		return (
			<div className="space-y-2">
				<div className="space-y-1">
					<Label>Method</Label>
					<Select
						value={String(config.method ?? "GET")}
						onValueChange={(v) => set("method", v)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{["GET", "POST", "PUT", "PATCH", "DELETE"].map(
								(m) => (
									<SelectItem key={m} value={m}>
										{m}
									</SelectItem>
								),
							)}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1">
					<Label>URL</Label>
					<Input
						value={String(config.url ?? "")}
						onChange={(e) => set("url", e.target.value)}
						placeholder="https://api.example.com/{{env.PATH}}"
					/>
				</div>
				<div className="space-y-1">
					<Label>Body (JSON or template)</Label>
					<Textarea
						value={
							typeof config.body === "string"
								? config.body
								: config.body
									? JSON.stringify(config.body, null, 2)
									: ""
						}
						onChange={(e) => {
							try {
								set("body", JSON.parse(e.target.value));
							} catch {
								set("body", e.target.value);
							}
						}}
						rows={4}
					/>
				</div>
			</div>
		);
	}

	if (type === "code.js") {
		return (
			<div className="space-y-1">
				<Label>JavaScript (return an object)</Label>
				<Textarea
					className="font-mono text-xs"
					value={String(config.code ?? "")}
					onChange={(e) => set("code", e.target.value)}
					rows={10}
				/>
			</div>
		);
	}

	if (type === "human.approval") {
		return (
			<div className="space-y-2">
				<div className="space-y-1">
					<Label>Channel</Label>
					<Select
						value={String(config.channel ?? "WEB")}
						onValueChange={(v) => set("channel", v)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="WEB">WebApp</SelectItem>
							<SelectItem value="EMAIL">Email</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1">
					<Label>Message</Label>
					<Textarea
						value={String(config.message ?? "")}
						onChange={(e) => set("message", e.target.value)}
						rows={3}
					/>
				</div>
				<div className="space-y-1">
					<Label>Email to</Label>
					<Input
						value={String(config.emailTo ?? "")}
						onChange={(e) => set("emailTo", e.target.value)}
						placeholder="{{env.APPROVER_EMAIL}}"
					/>
				</div>
			</div>
		);
	}

	if (type === "knowledge.retrieve") {
		return (
			<div className="space-y-2">
				<div className="space-y-1">
					<Label>Query</Label>
					<Textarea
						value={String(config.query ?? "")}
						onChange={(e) => set("query", e.target.value)}
						rows={3}
					/>
				</div>
				<div className="space-y-1">
					<Label>Top K</Label>
					<Input
						type="number"
						value={String(config.k ?? 5)}
						onChange={(e) => set("k", Number(e.target.value))}
					/>
				</div>
			</div>
		);
	}

	if (type === "ai.agent") {
		return (
			<div className="space-y-2">
				<div className="space-y-1">
					<Label>Modality</Label>
					<Select
						value={String(config.modality ?? "voice")}
						onValueChange={(v) => set("modality", v)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="voice">Voice</SelectItem>
							<SelectItem value="avatar">Avatar</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1">
					<Label>Channel</Label>
					<Select
						value={String(config.channel ?? "WEB")}
						onValueChange={(v) => set("channel", v)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="WEB">WEB</SelectItem>
							<SelectItem value="PHONE">PHONE</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1">
					<Label>Phone (optional)</Label>
					<Input
						value={String(config.phoneNumber ?? "")}
						onChange={(e) => set("phoneNumber", e.target.value)}
						placeholder="{{trigger.body.phone}}"
					/>
				</div>
				<div className="space-y-1">
					<Label>Agent ID override</Label>
					<Input
						value={String(config.agentId ?? "")}
						onChange={(e) => set("agentId", e.target.value)}
						placeholder="defaults to campaign agent"
					/>
				</div>
			</div>
		);
	}

	if (type === "ai.llm") {
		return (
			<div className="space-y-2">
				<div className="space-y-1">
					<Label>Model</Label>
					<Input
						value={String(config.model ?? "gpt-4o-mini")}
						onChange={(e) => set("model", e.target.value)}
					/>
				</div>
				<div className="space-y-1">
					<Label>System</Label>
					<Textarea
						value={String(config.system ?? "")}
						onChange={(e) => set("system", e.target.value)}
						rows={2}
					/>
				</div>
				<div className="space-y-1">
					<Label>Prompt</Label>
					<Textarea
						value={String(config.prompt ?? "")}
						onChange={(e) => set("prompt", e.target.value)}
						rows={5}
					/>
				</div>
			</div>
		);
	}

	if (
		type === "storage.s3" ||
		type === "storage.azure" ||
		type === "storage.gcp"
	) {
		return (
			<div className="space-y-2">
				<div className="space-y-1">
					<Label>Operation</Label>
					<Select
						value={String(config.operation ?? "read")}
						onValueChange={(v) => set("operation", v)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{["read", "write", "list", "delete"].map((op) => (
								<SelectItem key={op} value={op}>
									{op}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				{type === "storage.azure" ? (
					<>
						<div className="space-y-1">
							<Label>Account</Label>
							<Input
								value={String(config.accountName ?? "")}
								onChange={(e) =>
									set("accountName", e.target.value)
								}
							/>
						</div>
						<div className="space-y-1">
							<Label>Container</Label>
							<Input
								value={String(config.container ?? "")}
								onChange={(e) =>
									set("container", e.target.value)
								}
							/>
						</div>
					</>
				) : (
					<div className="space-y-1">
						<Label>Bucket</Label>
						<Input
							value={String(config.bucket ?? "")}
							onChange={(e) => set("bucket", e.target.value)}
						/>
					</div>
				)}
				<div className="space-y-1">
					<Label>Key / path</Label>
					<Input
						value={String(config.key ?? "")}
						onChange={(e) => set("key", e.target.value)}
					/>
				</div>
				<div className="space-y-1">
					<Label>Body (write)</Label>
					<Textarea
						value={String(config.body ?? config.content ?? "")}
						onChange={(e) => set("body", e.target.value)}
						rows={3}
					/>
				</div>
				{type === "storage.azure" && (
					<div className="space-y-1">
						<Label>SAS token</Label>
						<Input
							value={String(config.sasToken ?? "")}
							onChange={(e) => set("sasToken", e.target.value)}
						/>
					</div>
				)}
				{type === "storage.gcp" && (
					<div className="space-y-1">
						<Label>Access token</Label>
						<Input
							value={String(config.accessToken ?? "")}
							onChange={(e) => set("accessToken", e.target.value)}
						/>
					</div>
				)}
			</div>
		);
	}

	return (
		<p className="text-xs text-muted-foreground">
			No extra configuration for this node.
		</p>
	);
}
