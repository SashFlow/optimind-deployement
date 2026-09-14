/** Public exports for @repo/ui/assistant-ui
 *
 * Keep this barrel free of optional packages that require Zod v4
 * (e.g. generative-ui). Import those via deep paths instead:
 * `@repo/ui/assistant-ui/generative-ui`
 */

export * from "../../hooks/use-attachment-src";
export * from "../../hooks/use-copy-to-clipboard";
export {
	ComposerAddAttachment,
	ComposerAttachments,
	UserMessageAttachments,
} from "./elements/attachment.aui";
export { File } from "./elements/file";
export { ThreadFollowupSuggestions } from "./elements/follow-up-suggestions.aui";
export { Image } from "./elements/image";
export { MarkdownText } from "./elements/markdown-text";
export { MessageTiming } from "./elements/message-timing.aui";
export {
	Reasoning,
	ReasoningContent,
	ReasoningRoot,
	ReasoningText,
	ReasoningTrigger,
} from "./elements/reasoning.aui";
export {
	Source,
	SourceIcon,
	type SourceProps,
	Sources,
	SourceTitle,
	sourceVariants,
} from "./elements/sources.aui";
export {
	ReadOnlyThread,
	Thread,
	type ThreadComponents,
	type ThreadGroupPart,
	type ThreadProps,
} from "./elements/thread.aui";
export { ThreadList } from "./elements/thread-list.aui";
export { ToolFallback } from "./elements/tool-fallback.aui";
export {
	ToolGroupContent,
	ToolGroupRoot,
	ToolGroupTrigger,
} from "./elements/tool-group.aui";
export { TooltipIconButton } from "./elements/tooltip-icon-button";
export {
	VoiceOrb,
	type VoiceOrbProps,
	type VoiceOrbState,
	type VoiceOrbVariant,
} from "./elements/voice";
