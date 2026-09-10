/** Public exports for @repo/ui/assistant-ui
 *
 * Keep this barrel free of optional packages that require Zod v4
 * (e.g. generative-ui). Import those via deep paths instead:
 * `@repo/ui/assistant-ui/generative-ui`
 */

export {
	Thread,
	ReadOnlyThread,
	type ThreadProps,
	type ThreadComponents,
	type ThreadGroupPart,
} from "./elements/thread.aui";
export { ThreadList } from "./elements/thread-list.aui";
export { MarkdownText } from "./elements/markdown-text";
export { TooltipIconButton } from "./elements/tooltip-icon-button";
export {
	ComposerAddAttachment,
	ComposerAttachments,
	UserMessageAttachments,
} from "./elements/attachment.aui";
export { File } from "./elements/file";
export { Image } from "./elements/image";
export {
	Reasoning,
	ReasoningContent,
	ReasoningRoot,
	ReasoningText,
	ReasoningTrigger,
} from "./elements/reasoning.aui";
export { ToolFallback } from "./elements/tool-fallback.aui";
export {
	ToolGroupContent,
	ToolGroupRoot,
	ToolGroupTrigger,
} from "./elements/tool-group.aui";
export { ThreadFollowupSuggestions } from "./elements/follow-up-suggestions.aui";
export {
	Sources,
	Source,
	SourceIcon,
	SourceTitle,
	sourceVariants,
	type SourceProps,
} from "./elements/sources.aui";
export { MessageTiming } from "./elements/message-timing.aui";
export * from "../../hooks/use-attachment-src";
export * from "../../hooks/use-copy-to-clipboard";
