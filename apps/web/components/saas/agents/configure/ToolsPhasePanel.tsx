"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { cn } from "@repo/ui/utils";
import {
	CodeIcon,
	FunctionSquareIcon,
	PlusIcon,
	WrenchIcon,
} from "lucide-react";
import * as React from "react";
import { CreateApiToolDialog } from "@/components/saas/agents/tools/CreateApiToolDialog";
import { CreatePythonToolDialog } from "@/components/saas/agents/tools/CreatePythonToolDialog";
import type {
	AgentConfigDocument,
	ToolsByPhaseConfig,
} from "@/lib/agent-config";
import { syncToolsFromPhases } from "@/lib/agent-config";
import {
	useCreateToolMutation,
	useUpdateToolMutation,
} from "@/services/api/hooks";
import type { ToolCreateInput, ToolDefinition } from "@/services/api/types";

type ToolPhase = keyof ToolsByPhaseConfig;

const PHASES: { value: ToolPhase; label: string }[] = [
	{ value: "pre_call", label: "Pre-call" },
	{ value: "on_call", label: "On-call" },
	{ value: "post_call", label: "Post-call" },
];

const TOOL_CATEGORIES = [
	{ id: "api" as const, label: "API", icon: CodeIcon },
	{ id: "function" as const, label: "Function", icon: FunctionSquareIcon },
];

const BUILTIN_TOOLS = [
	["end_call", "End Call"],
	["reschedule", "ReScheduled"],
	["transfer_call", "Transfer Call"],
	["knowledge_search", "Knowledge Search"],
] as const;

type BuiltinToolKey = (typeof BUILTIN_TOOLS)[number][0];

type ToolsPhasePanelProps = {
	config: AgentConfigDocument;
	orgTools: ToolDefinition[];
	organizationId: string;
	onConfigChange: (patch: Partial<AgentConfigDocument>) => void;
};

function toggleToolInPhase(
	toolsByPhase: ToolsByPhaseConfig,
	phase: ToolPhase,
	toolId: string,
	enabled: boolean,
): ToolsByPhaseConfig {
	const current = toolsByPhase[phase];
	const next = enabled
		? current.includes(toolId)
			? current
			: [...current, toolId]
		: current.filter((id) => id !== toolId);
	return { ...toolsByPhase, [phase]: next };
}

function ToolToggleRow({
	label,
	description,
	enabled,
	onToggle,
	actions,
}: {
	label: string;
	description?: string;
	enabled: boolean;
	onToggle: () => void;
	actions?: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors",
				enabled
					? "border-primary bg-primary/5"
					: "border-border/80 bg-background",
			)}
		>
			<button
				type="button"
				onClick={onToggle}
				className="min-w-0 flex-1 text-left"
			>
				<p className="text-sm font-medium">{label}</p>
				{description ? (
					<p className="text-xs text-muted-foreground capitalize">
						{description}
					</p>
				) : null}
			</button>
			<div className="flex shrink-0 items-center gap-2">
				{actions}
				<button
					type="button"
					onClick={onToggle}
					className={cn(
						"rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
						enabled
							? "bg-primary text-primary-foreground"
							: "bg-muted text-muted-foreground hover:text-foreground",
					)}
				>
					{enabled ? "Enabled" : "Disabled"}
				</button>
			</div>
		</div>
	);
}

export function ToolsPhasePanel({
	config,
	orgTools,
	organizationId,
	onConfigChange,
}: ToolsPhasePanelProps) {
	const [activePhase, setActivePhase] = React.useState<ToolPhase>("on_call");
	const [apiDialogOpen, setApiDialogOpen] = React.useState(false);
	const [pythonDialogOpen, setPythonDialogOpen] = React.useState(false);
	const [editingTool, setEditingTool] = React.useState<ToolDefinition | null>(
		null,
	);

	const createTool = useCreateToolMutation(organizationId);
	const updateTool = useUpdateToolMutation(organizationId);
	const isToolMutationPending = createTool.isPending || updateTool.isPending;

	function updatePhaseTools(
		phase: ToolPhase,
		toolId: string,
		enabled: boolean,
	) {
		const tools_by_phase = toggleToolInPhase(
			config.tools_by_phase,
			phase,
			toolId,
			enabled,
		);
		onConfigChange({
			tools_by_phase,
			tools: syncToolsFromPhases(tools_by_phase),
		});
	}

	function updateBuiltinTool(key: BuiltinToolKey, enabled: boolean) {
		onConfigChange({
			tools_config: { ...config.tools_config, [key]: enabled },
		});
	}

	async function handleSubmitTool(input: ToolCreateInput) {
		if (editingTool) {
			return updateTool.mutateAsync({
				id: editingTool.id,
				...input,
			});
		}
		const tool = await createTool.mutateAsync(input);
		updatePhaseTools(activePhase, tool.id, true);
		return tool;
	}

	function openCreateDialog(
		categoryId: (typeof TOOL_CATEGORIES)[number]["id"],
	) {
		setEditingTool(null);
		if (categoryId === "api") {
			setApiDialogOpen(true);
		}
		if (categoryId === "function") {
			setPythonDialogOpen(true);
		}
	}

	function openEditDialog(tool: ToolDefinition) {
		setEditingTool(tool);
		if (tool.tool_type === "http") {
			setApiDialogOpen(true);
			return;
		}
		setPythonDialogOpen(true);
	}

	function handleApiDialogOpenChange(open: boolean) {
		setApiDialogOpen(open);
		if (!open) {
			setEditingTool(null);
		}
	}

	function handlePythonDialogOpenChange(open: boolean) {
		setPythonDialogOpen(open);
		if (!open) {
			setEditingTool(null);
		}
	}

	return (
		<div className="rounded-xl border bg-card">
			<div className="border-b px-4 py-4 md:px-5">
				<h3 className="text-sm font-semibold">Agent tools</h3>
				<p className="mt-0.5 text-xs text-muted-foreground">
					Enable tools for this agent and add API or Python functions
					per call phase.
				</p>
			</div>

			<div className="px-4 py-4 md:px-5">
				<Tabs
					value={activePhase}
					onValueChange={(value) =>
						value && setActivePhase(value as ToolPhase)
					}
					className="w-full gap-4"
				>
					<TabsList className="h-9 w-full justify-start rounded-none border-b bg-transparent p-0">
						{PHASES.map((phase) => (
							<TabsTrigger
								key={phase.value}
								value={phase.value}
								className="rounded-none px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
							>
								{phase.label}
							</TabsTrigger>
						))}
					</TabsList>

					{PHASES.map((phase) => {
						const enabledCustomIds = new Set(
							config.tools_by_phase[phase.value],
						);
						const hasBuiltinSection = phase.value === "on_call";
						const hasAnyTools =
							hasBuiltinSection || orgTools.length > 0;

						return (
							<TabsContent
								key={phase.value}
								value={phase.value}
								className="mt-4"
							>
								<div className="grid gap-4 lg:grid-cols-[1fr_220px]">
									<div className="min-h-[180px] rounded-lg border border-dashed bg-muted/20 p-4">
										{!hasAnyTools ? (
											<div className="flex h-full min-h-[148px] flex-col items-center justify-center text-center">
												<div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
													<WrenchIcon className="size-4 text-muted-foreground" />
												</div>
												<p className="text-sm text-muted-foreground">
													No tools yet. Create an API
													or Python tool from the
													panel.
												</p>
											</div>
										) : (
											<div className="space-y-2">
												{hasBuiltinSection
													? BUILTIN_TOOLS.map(
															([key, label]) => (
																<ToolToggleRow
																	key={key}
																	label={
																		label
																	}
																	description="Built-in"
																	enabled={
																		config
																			.tools_config[
																			key
																		]
																	}
																	onToggle={() =>
																		updateBuiltinTool(
																			key,
																			!config
																				.tools_config[
																				key
																			],
																		)
																	}
																/>
															),
														)
													: null}
												{orgTools.map((tool) => {
													const enabled =
														enabledCustomIds.has(
															tool.id,
														);
													return (
														<ToolToggleRow
															key={tool.id}
															label={tool.name}
															description={
																tool.tool_type
															}
															enabled={enabled}
															onToggle={() =>
																updatePhaseTools(
																	phase.value,
																	tool.id,
																	!enabled,
																)
															}
															actions={
																<button
																	type="button"
																	className="text-xs text-muted-foreground hover:text-foreground"
																	onClick={() =>
																		openEditDialog(
																			tool,
																		)
																	}
																>
																	Edit
																</button>
															}
														/>
													);
												})}
											</div>
										)}
									</div>

									<div className="rounded-lg border bg-background/60 p-3">
										<p className="mb-2 text-sm font-medium">
											Add tool
										</p>
										<div className="space-y-1">
											{TOOL_CATEGORIES.map((category) => (
												<button
													key={category.id}
													type="button"
													onClick={() =>
														openCreateDialog(
															category.id,
														)
													}
													className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted/50"
												>
													<div className="flex items-center gap-2">
														<category.icon className="size-4 text-muted-foreground" />
														<span>
															{category.label}
														</span>
													</div>
													<PlusIcon className="size-4 text-muted-foreground" />
												</button>
											))}
										</div>
									</div>
								</div>
							</TabsContent>
						);
					})}
				</Tabs>
			</div>

			<CreateApiToolDialog
				open={apiDialogOpen}
				onOpenChange={handleApiDialogOpenChange}
				tool={editingTool?.tool_type === "http" ? editingTool : null}
				onSubmit={handleSubmitTool}
				isPending={isToolMutationPending}
			/>
			<CreatePythonToolDialog
				open={pythonDialogOpen}
				onOpenChange={handlePythonDialogOpenChange}
				tool={editingTool?.tool_type === "python" ? editingTool : null}
				onSubmit={handleSubmitTool}
				isPending={isToolMutationPending}
			/>
		</div>
	);
}
