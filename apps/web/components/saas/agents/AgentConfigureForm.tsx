"use client";

import { Button } from "@repo/ui/button";
import { ButtonGroup } from "@repo/ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { cn } from "@repo/ui/utils";
import { ChevronDownIcon } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { AgentConfigurePreview } from "@/components/saas/agents/AgentConfigurePreview";
import { AdvancedSection } from "@/components/saas/agents/configure/sections/AdvancedSection";
import { AvatarSection } from "@/components/saas/agents/configure/sections/AvatarSection";
import { CallSessionSection } from "@/components/saas/agents/configure/sections/CallSessionSection";
import { GeneralSection } from "@/components/saas/agents/configure/sections/GeneralSection";
import { PromptsSection } from "@/components/saas/agents/configure/sections/PromptsSection";
import { ToolsSection } from "@/components/saas/agents/configure/sections/ToolsSection";
import { VoiceSection } from "@/components/saas/agents/configure/sections/VoiceSection";
import type { AgentConfigDocument } from "@/lib/agent-config";
import {
	conversationModelSupportsWebSearch,
	getVoiceModelId,
} from "@/lib/agent-pipeline";
import {
	useKnowledgeBasesQuery,
	useProviderModelsQuery,
	useProvidersQuery,
	useProviderVoicesQuery,
	useToolsQuery,
} from "@/services/api/hooks";
import type { Agent } from "@/services/api/types";

const SECTIONS = [
	{ value: "preview", label: "Preview" },
	{ value: "general", label: "General" },
	{ value: "prompts", label: "Persona" },
	{ value: "voice", label: "Voice" },
	{ value: "avatar", label: "Avatar" },
	{ value: "call", label: "Call & Session" },
	{ value: "tools", label: "Tools" },
	{ value: "advanced", label: "Advanced" },
] as const;

type SectionValue = (typeof SECTIONS)[number]["value"];

const SECTION_SCROLL_CLASS =
	"min-h-0 flex-1 overflow-y-auto py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const SECTION_TAB_CLASS =
	"mt-0 flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden";

type AgentConfigureFormProps = {
	config: AgentConfigDocument;
	onConfigChange: (config: AgentConfigDocument) => void;
	organizationId: string;
	versionId?: string;
	agent: Agent;
	savedVariables: AgentConfigDocument["variables"];
	hasUnsavedVariables?: boolean;
	avatarEnabled?: boolean;
	avatarPreviewUrl?: string | null;
	isDirty?: boolean;
	isSaving?: boolean;
	isPublishing?: boolean;
	onSave?: () => void | Promise<void>;
	onPublish?: () => void | Promise<void>;
};

export function AgentConfigureForm({
	config,
	onConfigChange,
	organizationId,
	versionId,
	agent,
	savedVariables,
	hasUnsavedVariables = false,
	avatarEnabled = false,
	avatarPreviewUrl = null,
	isDirty = false,
	isSaving = false,
	isPublishing = false,
	onSave,
	onPublish,
}: AgentConfigureFormProps) {
	const [activeSection, setActiveSection] = useState<SectionValue>("preview");
	const llmModels = useProviderModelsQuery("llm").data ?? [];
	const realtimeModels = useProviderModelsQuery("realtime").data ?? [];
	const liveModels = useProviderModelsQuery("live").data ?? [];
	const sttModels = useProviderModelsQuery("stt").data ?? [];
	const ttsModels = useProviderModelsQuery("tts").data ?? [];
	const providers = useProvidersQuery().data ?? [];
	const selectedRealtimeModel = realtimeModels.find(
		(model) => model.id === config.realtime?.provider_model_id,
	);
	const voiceModelId = getVoiceModelId(config, selectedRealtimeModel);
	const voices = useProviderVoicesQuery(voiceModelId).data ?? [];
	const knowledgeBases = useKnowledgeBasesQuery(organizationId).data ?? [];
	const tools = useToolsQuery(organizationId, agent.id).data ?? [];
	const conversationModels = useMemo(
		() => [...llmModels, ...realtimeModels, ...liveModels],
		[llmModels, realtimeModels, liveModels],
	);
	const webSearchSupported = conversationModelSupportsWebSearch(
		config,
		conversationModels,
	);

	useEffect(() => {
		if (!webSearchSupported && config.tools_config.web_search) {
			onConfigChange({
				...config,
				tools_config: {
					...config.tools_config,
					web_search: false,
				},
			});
		}
	}, [webSearchSupported, config.tools_config.web_search]);

	function updateConfig(patch: Partial<AgentConfigDocument>) {
		onConfigChange({ ...config, ...patch });
	}

	const actionsBusy = isSaving || isPublishing;

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<Tabs
				value={activeSection}
				onValueChange={(value) =>
					value && setActiveSection(value as SectionValue)
				}
				className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
			>
				<div className="flex shrink-0 items-center gap-3">
					<div className="min-w-0 flex-1">
						<Select
							value={activeSection}
							onValueChange={(value) =>
								value && setActiveSection(value as SectionValue)
							}
						>
							<SelectTrigger
								aria-label="Configure section"
								className="h-9 w-full rounded-full bg-sidebar shadow-sm ring-1 ring-black/5 min-[1250px]:hidden"
							>
								<SelectValue placeholder="Select section" />
							</SelectTrigger>
							<SelectContent>
								{SECTIONS.map((section) => (
									<SelectItem
										key={section.value}
										value={section.value}
									>
										{section.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<div className="scrollbar-none hidden min-w-0 overflow-x-auto min-[1250px]:block">
							<TabsList className="h-9 w-max gap-0.5 rounded-full bg-sidebar p-1 text-muted-foreground">
								{SECTIONS.map((section) => {
									const isActive =
										activeSection === section.value;
									return (
										<TabsTrigger
											key={section.value}
											value={section.value}
											className={cn(
												"h-7 flex-none gap-2 rounded-full px-4 py-0 shadow-none transition-colors",
												isActive
													? "bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground"
													: "text-muted-foreground hover:text-foreground",
											)}
										>
											{section.label}
										</TabsTrigger>
									);
								})}
							</TabsList>
						</div>
					</div>
					<ButtonGroup className="h-9 shrink-0">
						<Button
							type="button"
							disabled={actionsBusy || !onPublish}
							onClick={() => void onPublish?.()}
							className="h-9"
						>
							{isPublishing
								? "Publishing…"
								: isSaving
									? "Saving…"
									: "Publish"}
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									disabled={actionsBusy}
									aria-label="More save options"
									className="h-9 px-2"
								>
									<ChevronDownIcon className="size-3.5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									disabled={
										!isDirty || actionsBusy || !onSave
									}
									onClick={() => void onSave?.()}
								>
									Save
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={actionsBusy || !onPublish}
									onClick={() => void onPublish?.()}
								>
									Publish
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</ButtonGroup>
				</div>

				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<TabsContent value="general" className={SECTION_TAB_CLASS}>
						<div className={SECTION_SCROLL_CLASS}>
							<GeneralSection
								config={config}
								onConfigChange={updateConfig}
								providers={providers}
								llmModels={llmModels}
								realtimeModels={realtimeModels}
								liveModels={liveModels}
								sttModels={sttModels}
								ttsModels={ttsModels}
								voices={voices}
								knowledgeBases={knowledgeBases}
							/>
						</div>
					</TabsContent>

					<TabsContent value="voice" className={SECTION_TAB_CLASS}>
						<div className={SECTION_SCROLL_CLASS}>
							<VoiceSection
								config={config}
								onConfigChange={updateConfig}
							/>
						</div>
					</TabsContent>

					<TabsContent value="avatar" className={SECTION_TAB_CLASS}>
						<div className={SECTION_SCROLL_CLASS}>
							<AvatarSection
								config={config}
								organizationId={organizationId}
								onConfigChange={updateConfig}
							/>
						</div>
					</TabsContent>

					<TabsContent value="prompts" className={SECTION_TAB_CLASS}>
						<div className={SECTION_SCROLL_CLASS}>
							<PromptsSection
								config={config}
								onConfigChange={updateConfig}
							/>
						</div>
					</TabsContent>

					<TabsContent value="call" className={SECTION_TAB_CLASS}>
						<div className={SECTION_SCROLL_CLASS}>
							<CallSessionSection
								config={config}
								onConfigChange={updateConfig}
							/>
						</div>
					</TabsContent>

					<TabsContent value="tools" className={SECTION_TAB_CLASS}>
						<div className={SECTION_SCROLL_CLASS}>
							<ToolsSection
								config={config}
								orgTools={tools}
								organizationId={organizationId}
								agentId={agent.id}
								webSearchSupported={webSearchSupported}
								onConfigChange={updateConfig}
							/>
						</div>
					</TabsContent>

					<TabsContent value="advanced" className={SECTION_TAB_CLASS}>
						<div className={SECTION_SCROLL_CLASS}>
							<AdvancedSection
								config={config}
								onConfigChange={updateConfig}
								versionId={versionId}
							/>
						</div>
					</TabsContent>

					<TabsContent value="preview" className={SECTION_TAB_CLASS}>
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
							<AgentConfigurePreview
								agent={agent}
								savedVariables={savedVariables}
								hasUnsavedVariables={hasUnsavedVariables}
								draftVersionId={versionId}
								avatarEnabled={avatarEnabled}
								avatarPreviewUrl={avatarPreviewUrl}
								className="min-h-0 flex-1"
							/>
						</div>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}
