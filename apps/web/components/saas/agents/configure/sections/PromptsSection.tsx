"use client";

import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/utils";
import {
	type LucideIcon,
	MessageSquareTextIcon,
	ShieldIcon,
	SparklesIcon,
	TargetIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
	ConfigureAccordionGroup,
	ConfigureAccordionItem,
} from "@/components/saas/agents/configure/ConfigureAccordionGroup";
import { ConfigureMarkdownEditor } from "@/components/saas/agents/configure/ConfigureMarkdownEditor";
import { VariableTokenBadge } from "@/components/saas/agents/configure/VariableTokenBadge";
import type { AgentConfigDocument, PromptSections } from "@/lib/agent-config";

const BEHAVIOR_PROMPT_FIELDS: {
	key: keyof PromptSections;

	label: string;

	description: string;

	placeholder: string;
}[] = [
		{
			key: "tools",

			label: "Tools",

			description:
				"How the agent should use available tools during conversation.",

			placeholder: "Describe when and how to invoke tools...",
		},

		{
			key: "personality",

			label: "Personality",

			description: "Baseline tone and character the agent should maintain.",

			placeholder: "e.g. Steady, positive energy. Relaxed, not syrupy.",
		},

		{
			key: "emotion",

			label: "Emotion",

			description: "Emotional range and when to express stronger feelings.",

			placeholder: "e.g. Default to calm. Use stronger emotions sparingly.",
		},

		{
			key: "phrase_variation",

			label: "Phrase variation",

			description: "Rules for varying wording across turns.",

			placeholder: "e.g. Don't open consecutive turns with the same word.",
		},

		{
			key: "pauses_and_filler_words",

			label: "Pauses and filler words",

			description:
				"How the agent handles hesitations and natural speech rhythm.",

			placeholder: "e.g. After 'um', insert a short pause then continue.",
		},

		{
			key: "self_corrections",

			label: "Self-corrections",

			description: "When the agent should restart or revise mid-sentence.",

			placeholder:
				"e.g. Drop the first phrasing and restart with a better one.",
		},

		{
			key: "non_verbal_sounds",

			label: "Non-verbal sounds",

			description: "Limits and usage for laughs, sighs, and similar cues.",

			placeholder: "e.g. Use sparingly, no more than one per turn.",
		},
	];

type PromptsSectionProps = {
	config: AgentConfigDocument;

	onConfigChange: (patch: Partial<AgentConfigDocument>) => void;
};

function PromptField({
	label,

	description,

	children,

	className,

	nested = false,
}: {
	label: string;

	description?: string;

	children: ReactNode;

	className?: string;

	nested?: boolean;
}) {
	return (
		<div
			className={cn(
				"space-y-2",

				nested && "rounded-lg border border-border/50 bg-muted/15 p-3",

				className,
			)}
		>
			<div>
				<Label className="text-sm font-medium">{label}</Label>

				{description ? (
					<p className="mt-0.5 text-xs text-muted-foreground">
						{description}
					</p>
				) : null}
			</div>

			{children}
		</div>
	);
}

function SectionHeader({
	title,

	description,

	icon: Icon,
}: {
	title: string;

	description: string;

	icon: LucideIcon;
}) {
	return (
		<div className="flex items-start gap-2.5">
			<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
				<Icon className="size-3.5 text-muted-foreground" />
			</div>

			<div>
				<h3 className="text-sm font-semibold">{title}</h3>

				<p className="mt-0.5 text-xs text-muted-foreground">
					{description}
				</p>
			</div>
		</div>
	);
}

export function PromptsSection({
	config,
	onConfigChange,
}: PromptsSectionProps) {
	const editorProps = {
		variables: config.variables,

		environmentVariables: config.environment_variables,
	};

	const definedVariables = config.variables.filter((variable) =>
		variable.name.trim(),
	);

	function updatePrompt(key: keyof PromptSections, value: string) {
		onConfigChange({
			prompts: { ...config.prompts, [key]: value },
		});
	}

	return (
		<div className="rounded-xl border bg-card divide-y">
			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					icon={TargetIcon}
					title="Objective"
					description="The primary goal the agent should accomplish on every call."
				/>

				<ConfigureMarkdownEditor
					value={config.prompts.goal}
					onChange={(value) => updatePrompt("goal", value)}
					placeholder="Define the agent's objective..."
					minHeight="112px"
					{...editorProps}
				/>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					icon={MessageSquareTextIcon}
					title="Conversation script"
					description="Context about who the agent is and the steps it should follow."
				/>

				{definedVariables.length > 0 ? (
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-[11px] text-muted-foreground">
							Variables:
						</span>

						{definedVariables.map((variable) => (
							<VariableTokenBadge
								key={variable.name}
								name={variable.name}
							/>
						))}
					</div>
				) : null}

				<div className="flex flex-col gap-4">
					<PromptField
						nested
						label="Identity"
						description="Name, role, and background the agent should adopt."
					>
						<ConfigureMarkdownEditor
							value={config.prompts.identity}
							onChange={(value) =>
								updatePrompt("identity", value)
							}
							placeholder="e.g. You are Maya, a support specialist at Acme Corp."
							minHeight="96px"
							{...editorProps}
						/>
					</PromptField>

					<PromptField
						nested
						label="Script steps"
						description="Ordered steps the agent should follow during the conversation."
					>
						<ConfigureMarkdownEditor
							value={config.prompts.user_information}
							onChange={(value) =>
								updatePrompt("user_information", value)
							}
							placeholder="e.g. 1. Greet the caller. 2. Confirm their account. 3. Resolve the issue."
							minHeight="96px"
							{...editorProps}
						/>
					</PromptField>
				</div>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					icon={ShieldIcon}
					title="Response guidelines"
					description="Rules that shape how the agent formats and constrains its replies."
				/>

				<div className="flex flex-col gap-4">
					<PromptField
						nested
						label="Output rules"
						description="Formatting, length, and structure requirements."
					>
						<ConfigureMarkdownEditor
							value={config.prompts.output_rules}
							onChange={(value) =>
								updatePrompt("output_rules", value)
							}
							placeholder="e.g. Keep responses concise. Use plain language."
							minHeight="96px"
							{...editorProps}
						/>
					</PromptField>

					<PromptField
						nested
						label="Guardrails"
						description="Topics and behaviors the agent must avoid."
					>
						<ConfigureMarkdownEditor
							value={config.prompts.guardrails}
							onChange={(value) =>
								updatePrompt("guardrails", value)
							}
							placeholder="e.g. Do not provide medical or legal advice."
							minHeight="96px"
							{...editorProps}
						/>
					</PromptField>
				</div>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					icon={SparklesIcon}
					title="Speech & behavior"
					description="Fine-grained instructions for personality, delivery, and conversational style."
				/>

				<ConfigureAccordionGroup className="border-0 bg-transparent p-0">
					{BEHAVIOR_PROMPT_FIELDS.map((field) => (
						<ConfigureAccordionItem
							key={field.key}
							value={field.key}
							trigger={
								<span className="text-sm font-medium">
									{field.label}
								</span>
							}
						>
							<div className="space-y-2">
								<p className="text-xs text-muted-foreground">
									{field.description}
								</p>

								<ConfigureMarkdownEditor
									value={config.prompts[field.key]}
									onChange={(value) =>
										updatePrompt(field.key, value)
									}
									placeholder={field.placeholder}
									minHeight="80px"
									{...editorProps}
								/>
							</div>
						</ConfigureAccordionItem>
					))}
				</ConfigureAccordionGroup>
			</div>
		</div>
	);
}
