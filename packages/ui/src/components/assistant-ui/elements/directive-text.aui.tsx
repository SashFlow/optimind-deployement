"use client";

import type {
	TextMessagePartComponent,
	Unstable_DirectiveFormatter,
} from "@assistant-ui/react";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/react";
import { memo } from "react";
import {
	type CreateDirectiveTextOptions,
	createDirectiveText as createDirectiveTextBase,
} from "./directive-text";

export type {
	CreateDirectiveTextOptions,
	DirectiveTextFormatter,
	DirectiveTextSegment,
} from "./directive-text";

/** Creates a `Text` message part component that parses directive syntax and renders inline chips. */
export function createDirectiveText(
	formatter: Unstable_DirectiveFormatter,
	options?: CreateDirectiveTextOptions,
): TextMessagePartComponent {
	return createDirectiveTextBase(formatter, options);
}

/** `Text` message part component that renders directive syntax as inline chips. */
export const DirectiveText: TextMessagePartComponent = memo(
	createDirectiveTextBase(unstable_defaultDirectiveFormatter),
);
