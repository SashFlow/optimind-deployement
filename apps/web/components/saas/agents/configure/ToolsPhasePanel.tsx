"use client";

import { Checkbox } from "@repo/ui/checkbox";
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
import { useCreateToolMutation } from "@/services/api/hooks";
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
	["api_tools", "API Tools"],
	["widget_tools", "Widget Tools"],
	["knowledge_search", "Knowledge Search"],
] as const;

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
	checked: boolean,
): ToolsByPhaseConfig {
	const current = toolsByPhase[phase];
	const next = checked
		? [...current, toolId]
		: current.filter((id) => id !== toolId);
	return { ...toolsByPhase, [phase]: next };
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

	const createTool = useCreateToolMutation(organizationId);

	function updatePhaseTools(
		phase: ToolPhase,
		toolId: string,
		checked: boolean,
	) {
		const tools_by_phase = toggleToolInPhase(
			config.tools_by_phase,
			phase,
			toolId,
			checked,
		);
		onConfigChange({
			tools_by_phase,
			tools: syncToolsFromPhases(tools_by_phase),
		});
	}

	function updateBuiltinTool(
		key: keyof AgentConfigDocument["tools_config"],
		checked: boolean,
	) {
		onConfigChange({
			tools_config: { ...config.tools_config, [key]: checked },
		});
	}

	async function handleCreateTool(input: ToolCreateInput) {
		const tool = await createTool.mutateAsync(input);
		updatePhaseTools(activePhase, tool.id, true);
		return tool;
	}

	function openCategoryDialog(
		categoryId: (typeof TOOL_CATEGORIES)[number]["id"],
	) {
		if (categoryId === "api") setApiDialogOpen(true);
		if (categoryId === "function") setPythonDialogOpen(true);
	}

	return (
		<div className="rounded-xl border bg-card">
			<div className="border-b px-4 py-4 md:px-5">
				<h3 className="text-sm font-semibold">Agent tools</h3>
				<p className="mt-0.5 text-xs text-muted-foreground">
					Add API endpoints and Python functions for each call phase.
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
					<TabsList
						variant="line"
						className="h-9 w-full justify-start rounded-none border-b bg-transparent p-0"
					>
						{PHASES.map((phase) => (
							<TabsTrigger
								key={phase.value}
								value={phase.value}
								className="rounded-none px-4"
							>
								{phase.label}
							</TabsTrigger>
						))}
					</TabsList>

					{PHASES.map((phase) => (
						<TabsContent
							key={phase.value}
							value={phase.value}
							className="mt-4"
						>
							<div className="grid gap-4 lg:grid-cols-[1fr_220px]">
								<div className="min-h-[180px] rounded-lg border border-dashed bg-muted/20 p-4">
									{config.tools_by_phase[phase.value]
										.length === 0 ? (
										<div className="flex h-full min-h-[148px] flex-col items-center justify-center text-center">
											<div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
												<WrenchIcon className="size-4 text-muted-foreground" />
											</div>
											<p className="text-sm text-muted-foreground">
												No tools added yet. Create an
												API or Python tool from the
												panel.
											</p>
										</div>
									) : (
										<div className="space-y-2">
											{config.tools_by_phase[
												phase.value
											].map((toolId) => {
												const tool = orgTools.find(
													(t) => t.id === toolId,
												);
												return (
													<div
														key={toolId}
														className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm"
													>
														<div>
															<p className="font-medium">
																{tool?.name ??
																	toolId}
															</p>
															{tool ? (
																<p className="text-xs text-muted-foreground capitalize">
																	{
																		tool.tool_type
																	}
																</p>
															) : null}
														</div>
														<button
															type="button"
															className="text-xs text-muted-foreground hover:text-foreground"
															onClick={() =>
																updatePhaseTools(
																	phase.value,
																	toolId,
																	false,
																)
															}
														>
															Remove
														</button>
													</div>
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
													openCategoryDialog(
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

							{phase.value === "on_call" ? (
								<div className="mt-4 space-y-4 border-t pt-4">
									<div>
										<p className="mb-3 text-xs font-medium text-muted-foreground">
											Built-in tools
										</p>
										<div className="grid gap-2 sm:grid-cols-2">
											{BUILTIN_TOOLS.map(
												([key, label]) => (
													<label
														key={key}
														className="flex items-center gap-2 text-sm"
													>
														<Checkbox
															checked={
																config
																	.tools_config[
																key
																]
															}
															onCheckedChange={(
																checked,
															) =>
																updateBuiltinTool(
																	key,
																	checked ===
																	true,
																)
															}
														/>
														{label}
													</label>
												),
											)}
										</div>
									</div>
									<div>
										<p className="mb-3 text-xs font-medium text-muted-foreground">
											Organization tools
										</p>
										<div className="space-y-2">
											{orgTools.length === 0 ? (
												<p className="text-sm text-muted-foreground">
													No organization tools yet.
												</p>
											) : (
												orgTools.map((tool) => (
													<label
														key={tool.id}
														className={cn(
															"flex items-center gap-2 text-sm",
														)}
													>
														<Checkbox
															checked={config.tools_by_phase.on_call.includes(
																tool.id,
															)}
															onCheckedChange={(
																checked,
															) =>
																updatePhaseTools(
																	"on_call",
																	tool.id,
																	checked ===
																	true,
																)
															}
														/>
														{tool.name}
													</label>
												))
											)}
										</div>
									</div>
								</div>
							) : (
								<div className="mt-4 border-t pt-4">
									<p className="mb-3 text-xs font-medium text-muted-foreground">
										Organization tools
									</p>
									<div className="space-y-2">
										{orgTools.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												No organization tools yet.
											</p>
										) : (
											orgTools.map((tool) => (
												<label
													key={tool.id}
													className="flex items-center gap-2 text-sm"
												>
													<Checkbox
														checked={config.tools_by_phase[
															phase.value
														].includes(tool.id)}
														onCheckedChange={(
															checked,
														) =>
															updatePhaseTools(
																phase.value,
																tool.id,
																checked ===
																true,
															)
														}
													/>
													{tool.name}
												</label>
											))
										)}
									</div>
								</div>
							)}
						</TabsContent>
					))}
				</Tabs>
			</div>

			<CreateApiToolDialog
				open={apiDialogOpen}
				onOpenChange={setApiDialogOpen}
				onCreate={handleCreateTool}
				isPending={createTool.isPending}
			/>
			<CreatePythonToolDialog
				open={pythonDialogOpen}
				onOpenChange={setPythonDialogOpen}
				onCreate={handleCreateTool}
				isPending={createTool.isPending}
			/>
		</div>
	);
}
