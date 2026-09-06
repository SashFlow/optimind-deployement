"use client";

import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { cn } from "@repo/ui/utils";
import { useState } from "react";
import { AgentConfigurePreview } from "@/components/saas/agents/AgentConfigurePreview";
import { AdvancedSection } from "@/components/saas/agents/configure/sections/AdvancedSection";
import { AvatarSection } from "@/components/saas/agents/configure/sections/AvatarSection";
import { CallSessionSection } from "@/components/saas/agents/configure/sections/CallSessionSection";
import { GeneralSection } from "@/components/saas/agents/configure/sections/GeneralSection";
import { PromptsSection } from "@/components/saas/agents/configure/sections/PromptsSection";
import { ToolsSection } from "@/components/saas/agents/configure/sections/ToolsSection";
import { VoiceSection } from "@/components/saas/agents/configure/sections/VoiceSection";
import type { AgentConfigDocument } from "@/lib/agent-config";
import { getVoiceModelId } from "@/lib/agent-pipeline";
import {
	useKnowledgeBasesQuery,
	useProviderModelsQuery,
	useProvidersQuery,
	useProviderVoicesQuery,
	useToolsQuery,
} from "@/services/api/hooks";
import type { Agent } from "@/services/api/types";

const SECTIONS = [
	{ value: "general", label: "General" },
	{ value: "prompts", label: "Prompts" },
	{ value: "voice", label: "Voice" },
	{ value: "avatar", label: "Avatar" },
	{ value: "call", label: "Call & Session" },
	{ value: "tools", label: "Tools" },
	{ value: "advanced", label: "Advanced" },
	{ value: "preview", label: "Preview" },
] as const;

type SectionValue = (typeof SECTIONS)[number]["value"];

const SECTION_SCROLL_CLASS =
	"h-full overflow-y-auto py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

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
	const [activeSection, setActiveSection] = useState<SectionValue>("general");
	const llmModels = useProviderModelsQuery("llm").data ?? [];
	const realtimeModels = useProviderModelsQuery("realtime").data ?? [];
	const sttModels = useProviderModelsQuery("stt").data ?? [];
	const ttsModels = useProviderModelsQuery("tts").data ?? [];
	const providers = useProvidersQuery().data ?? [];
	const selectedRealtimeModel = realtimeModels.find(
		(model) => model.id === config.realtime?.provider_model_id,
	);
	const voiceModelId = getVoiceModelId(config, selectedRealtimeModel);
	const voices = useProviderVoicesQuery(voiceModelId).data ?? [];
	const knowledgeBases = useKnowledgeBasesQuery(organizationId).data ?? [];
	const tools = useToolsQuery(organizationId).data ?? [];

	function updateConfig(patch: Partial<AgentConfigDocument>) {
		onConfigChange({ ...config, ...patch });
	}

	const actionsBusy = isSaving || isPublishing;

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden py-4 md:py-5">
			<Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
				<Tabs
					value={activeSection}
					onValueChange={(value) =>
						value && setActiveSection(value as SectionValue)
					}
					className="flex h-full min-h-0 flex-col gap-0 overflow-hidden"
				>
					<div className="flex shrink-0 items-center gap-3 border-b px-4 pt-4 pb-3 md:px-6">
						<div className="min-w-0 flex-1">
							<Select
								value={activeSection}
								onValueChange={(value) =>
									value &&
									setActiveSection(value as SectionValue)
								}
							>
								<SelectTrigger
									aria-label="Configure section"
									className="w-full rounded-full bg-sidebar shadow-sm ring-1 ring-black/5 sm:hidden"
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

							<div className="scrollbar-none hidden min-w-0 overflow-x-auto sm:block">
								<TabsList className="h-auto w-max gap-0.5 rounded-full bg-sidebar p-1 text-muted-foreground">
									{SECTIONS.map((section) => {
										const isActive =
											section.value === activeSection;
										return (
											<TabsTrigger
												key={section.value}
												value={section.value}
												data-active={
													isActive
														? "true"
														: undefined
												}
												className={cn(
													"h-9 flex-none gap-2 rounded-full px-4 py-2 text-muted-foreground shadow-none transition-colors hover:text-foreground",
													"data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none",
													"data-[active=true]:bg-foreground data-[active=true]:text-background",
													"data-[state=active]:hover:bg-foreground data-[state=active]:hover:text-background",
												)}
												style={
													isActive
														? {
															backgroundColor:
																"var(--foreground)",
															color: "var(--background)",
														}
														: undefined
												}
											>
												{section.label}
											</TabsTrigger>
										);
									})}
								</TabsList>
							</div>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!isDirty || actionsBusy || !onSave}
								onClick={() => void onSave?.()}
							>
								{isSaving ? "Saving…" : "Save"}
							</Button>
							<Button
								type="button"
								size="sm"
								disabled={actionsBusy || !onPublish}
								onClick={() => void onPublish?.()}
							>
								{isPublishing ? "Publishing…" : "Publish"}
							</Button>
						</div>
					</div>

					<CardContent className="min-h-0 flex-1 overflow-hidden px-4 py-0 md:px-6">
						<TabsContent
							value="general"
							className={cn(
								"mt-0 h-full overflow-hidden outline-none",
							)}
						>
							<div className={SECTION_SCROLL_CLASS}>
								<GeneralSection
									config={config}
									onConfigChange={updateConfig}
									providers={providers}
									llmModels={llmModels}
									realtimeModels={realtimeModels}
									sttModels={sttModels}
									ttsModels={ttsModels}
									voices={voices}
									knowledgeBases={knowledgeBases}
								/>
							</div>
						</TabsContent>

						<TabsContent
							value="voice"
							className="mt-0 h-full overflow-hidden outline-none"
						>
							<div className={SECTION_SCROLL_CLASS}>
								<VoiceSection
									config={config}
									onConfigChange={updateConfig}
								/>
							</div>
						</TabsContent>

						<TabsContent
							value="avatar"
							className="mt-0 h-full overflow-hidden outline-none"
						>
							<div className={SECTION_SCROLL_CLASS}>
								<AvatarSection
									config={config}
									organizationId={organizationId}
									onConfigChange={updateConfig}
								/>
							</div>
						</TabsContent>

						<TabsContent
							value="prompts"
							className="mt-0 h-full overflow-hidden outline-none"
						>
							<div className={SECTION_SCROLL_CLASS}>
								<PromptsSection
									config={config}
									onConfigChange={updateConfig}
								/>
							</div>
						</TabsContent>

						<TabsContent
							value="call"
							className="mt-0 h-full overflow-hidden outline-none"
						>
							<div className={SECTION_SCROLL_CLASS}>
								<CallSessionSection
									config={config}
									onConfigChange={updateConfig}
								/>
							</div>
						</TabsContent>

						<TabsContent
							value="tools"
							className="mt-0 h-full overflow-hidden outline-none"
						>
							<div className={SECTION_SCROLL_CLASS}>
								<ToolsSection
									config={config}
									orgTools={tools}
									organizationId={organizationId}
									onConfigChange={updateConfig}
								/>
							</div>
						</TabsContent>

						<TabsContent
							value="advanced"
							className="mt-0 h-full overflow-hidden outline-none"
						>
							<div className={SECTION_SCROLL_CLASS}>
								<AdvancedSection
									config={config}
									onConfigChange={updateConfig}
									versionId={versionId}
								/>
							</div>
						</TabsContent>

						<TabsContent
							value="preview"
							className="mt-0 h-full overflow-hidden outline-none"
						>
							<div className="h-full overflow-hidden py-4">
								<div className="h-full overflow-hidden rounded-xl border bg-background">
									<AgentConfigurePreview
										agent={agent}
										savedVariables={savedVariables}
										hasUnsavedVariables={
											hasUnsavedVariables
										}
										draftVersionId={versionId}
										avatarEnabled={avatarEnabled}
										avatarPreviewUrl={avatarPreviewUrl}
										className="h-full"
									/>
								</div>
							</div>
						</TabsContent>
					</CardContent>
				</Tabs>
			</Card>
		</div>
	);
}
