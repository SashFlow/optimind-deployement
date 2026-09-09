/**
 * Combine agent prompt sections into a single instructions string and
 * substitute {{variable}} / declared {variable} placeholders.
 *
 * Owns all prompt assembly for the voice worker: section merge, variable
 * substitution, timezone datetime, greeting / call-ending / transfer notes.
 * The worker should use config.instructions as-is.
 */

const DOUBLE_BRACE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
const SINGLE_BRACE_PATTERN = /(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g;

const DEFAULT_TIMEZONE = "Asia/Kolkata";

/** Prompt section order and headings mirror the configure UI / voice worker. */
const PROMPT_SECTIONS: ReadonlyArray<{
	heading: string;
	/** Primary config field; `instructions` reads from config root. */
	field: string;
	/** Older field names still present on published agent configs. */
	aliases?: readonly string[];
}> = [
	{ heading: "Objective", field: "goal" },
	{ heading: "Identity", field: "identity" },
	{ heading: "Additional instructions", field: "instructions" },
	{
		heading: "Conversation script",
		field: "script_steps",
		aliases: ["user_information"],
	},
	{ heading: "Output rules", field: "output_rules" },
	{ heading: "Guardrails", field: "guardrails" },
	{ heading: "Tools", field: "tools" },
	{ heading: "Personality", field: "personality" },
	{ heading: "Emotion", field: "emotion" },
	{ heading: "Phrase variation", field: "phrase_variation" },
	{ heading: "Pauses and filler words", field: "pauses_and_filler_words" },
	{ heading: "Self-corrections", field: "self_corrections" },
	{ heading: "Non-verbal sounds", field: "non_verbal_sounds" },
];

const EMPTY_PROMPT_SECTIONS: Record<string, string> = {
	identity: "",
	output_rules: "",
	tools: "",
	goal: "",
	guardrails: "",
	script_steps: "",
	pauses_and_filler_words: "",
	self_corrections: "",
	emotion: "",
	non_verbal_sounds: "",
	personality: "",
	phrase_variation: "",
};

function formatValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	return String(value);
}

export function substituteTemplate(
	text: string,
	values: Record<string, unknown>,
	singleBraceKeys?: ReadonlySet<string>,
): string {
	const withDouble = text.replace(
		DOUBLE_BRACE_PATTERN,
		(match, key: string) =>
			Object.hasOwn(values, key) ? formatValue(values[key]) : match,
	);

	if (!singleBraceKeys || singleBraceKeys.size === 0) {
		return withDouble;
	}

	return withDouble.replace(SINGLE_BRACE_PATTERN, (match, key: string) => {
		if (!singleBraceKeys.has(key) || !Object.hasOwn(values, key)) {
			return match;
		}
		return formatValue(values[key]);
	});
}

export function buildTemplateValues(
	contactMetadata: Record<string, unknown>,
	environmentVariables: Record<string, string>,
): Record<string, unknown> {
	return { ...contactMetadata, ...environmentVariables };
}

function asRecord(value: unknown): Record<string, unknown> {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return {};
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function variableNames(config: Record<string, unknown>): Set<string> {
	const names = new Set<string>();
	const variables = config.variables;
	if (!Array.isArray(variables)) return names;
	for (const variable of variables) {
		if (!variable || typeof variable !== "object") continue;
		const name = asString((variable as { name?: unknown }).name).trim();
		if (name) names.add(name);
	}
	return names;
}

function appendSection(
	sections: string[],
	heading: string,
	body: string,
): void {
	const text = body.trim();
	if (text) {
		sections.push(`## ${heading}\n\n${text}`);
	}
}

function resolveTimezone(config: Record<string, unknown>): string {
	const callEnding = asRecord(config.call_ending);
	const timezone = asString(callEnding.timezone).trim();
	return timezone || DEFAULT_TIMEZONE;
}

/** Format current date/time in the agent timezone for the mega prompt. */
export function formatCurrentDateTimeSection(
	timezone: string,
	now: Date = new Date(),
): string {
	let resolvedTimezone = timezone.trim() || DEFAULT_TIMEZONE;
	let formatted: string;
	try {
		formatted = new Intl.DateTimeFormat("en-US", {
			timeZone: resolvedTimezone,
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
			timeZoneName: "short",
		}).format(now);
	} catch {
		resolvedTimezone = DEFAULT_TIMEZONE;
		formatted = new Intl.DateTimeFormat("en-US", {
			timeZone: resolvedTimezone,
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
			timeZoneName: "short",
		}).format(now);
	}

	return (
		`The current date and time is ${formatted} (${resolvedTimezone}). ` +
		"Use this as the reference for any time-sensitive answers."
	);
}

function readPromptField(
	config: Record<string, unknown>,
	prompts: Record<string, unknown>,
	field: string,
	aliases?: readonly string[],
): string {
	if (field === "instructions") {
		return asString(config.instructions);
	}
	const primary = asString(prompts[field]).trim();
	if (primary) return asString(prompts[field]);
	if (aliases) {
		for (const alias of aliases) {
			const value = asString(prompts[alias]);
			if (value.trim()) return value;
		}
	}
	return "";
}

function greetingSection(greeting: Record<string, unknown>): string | null {
	if (greeting.enabled === false) return null;
	const text = asString(greeting.text).trim();
	if (!text) return null;

	const trigger = asString(greeting.trigger) || "on_join";
	if (trigger === "manual") {
		return (
			"Deliver the following as your opening message when the conversation begins:\n\n" +
			text
		);
	}

	const triggerNote =
		trigger === "on_join"
			? "at session start"
			: "after the user's first message";
	const interruptible =
		greeting.interruptible === false ? "not interruptible" : "interruptible";
	return (
		`Your opening greeting will be spoken automatically ${triggerNote} ` +
		`(${interruptible}). Do not repeat it verbatim afterward; continue naturally ` +
		"once the user responds.\n\n" +
		`Greeting text:\n${text}`
	);
}

function callEndingSection(
	callEnding: Record<string, unknown>,
): string | null {
	if (callEnding.enabled === false) return null;

	const parts: string[] = [];
	const farewell = asString(callEnding.farewell_message).trim();
	if (farewell) {
		parts.push(
			"When ending the call, deliver this farewell before invoking end_call:\n\n" +
				farewell,
		);
	}
	const maxDuration = callEnding.max_duration_seconds;
	if (typeof maxDuration === "number" && maxDuration > 0) {
		parts.push(
			`End the call if the conversation exceeds ${maxDuration} seconds.`,
		);
	}
	const endOnSilence = callEnding.end_on_silence_seconds;
	if (typeof endOnSilence === "number" && endOnSilence > 0) {
		parts.push(
			`End the call after ${endOnSilence} seconds of user silence.`,
		);
	}
	const inactivityEnd = callEnding.inactivity_end_seconds;
	const inactivityWarn = callEnding.inactivity_warning_seconds;
	if (
		typeof inactivityEnd === "number" &&
		inactivityEnd > 0 &&
		typeof inactivityWarn === "number" &&
		inactivityWarn > 0
	) {
		parts.push(
			`If the user is inactive, warn them after ${inactivityWarn} seconds and end the session after ${inactivityEnd} seconds of inactivity.`,
		);
	}

	if (parts.length === 0) return null;
	return parts.join("\n\n");
}

function transferSection(config: Record<string, unknown>): string | null {
	const toolsConfig = asRecord(config.tools_config);
	if (!toolsConfig.transfer_call) return null;

	const transferCall = asRecord(config.transfer_call);
	const transferNumber = asString(transferCall.transfer_number).trim();
	if (!transferNumber) {
		return (
			"Transfer to a human is enabled but no destination number is configured. " +
			"Apologize and offer a callback instead of attempting transfer."
		);
	}
	return (
		"You may transfer the caller to a human agent using the transfer_to_human tool " +
		"when they ask for a person or when policy requires escalation."
	);
}

/** Build the full mega prompt the voice worker should use as-is. */
function mergePromptSections(config: Record<string, unknown>): string {
	const sections: string[] = [];
	const prompts = asRecord(config.prompts);
	const timezone = resolveTimezone(config);

	const greeting = greetingSection(asRecord(config.greeting));
	if (greeting) {
		appendSection(sections, "Greeting", greeting);
	}

	for (const { heading, field, aliases } of PROMPT_SECTIONS) {
		appendSection(
			sections,
			heading,
			readPromptField(config, prompts, field, aliases),
		);

		if (field === "identity") {
			appendSection(
				sections,
				"Current date and time",
				formatCurrentDateTimeSection(timezone),
			);
		}
	}

	const callEnding = callEndingSection(asRecord(config.call_ending));
	if (callEnding) {
		appendSection(sections, "Call ending", callEnding);
	}

	const transfer = transferSection(config);
	if (transfer) {
		appendSection(sections, "Transfer", transfer);
	}

	if (sections.length > 0) {
		return sections.join("\n\n");
	}
	return "You are a helpful voice assistant.";
}

function substituteConfigTextFields(
	config: Record<string, unknown>,
	values: Record<string, unknown>,
	singleBraceKeys: ReadonlySet<string>,
): Record<string, unknown> {
	const sub = (text: string) =>
		substituteTemplate(text, values, singleBraceKeys);

	const prompts = asRecord(config.prompts);
	const substitutedPrompts: Record<string, string> = {};
	for (const [key, value] of Object.entries(prompts)) {
		substitutedPrompts[key] = sub(asString(value));
	}

	const greeting = asRecord(config.greeting);
	const callEnding = asRecord(config.call_ending);

	return {
		...config,
		instructions: sub(asString(config.instructions)),
		prompts: substitutedPrompts,
		greeting: {
			...greeting,
			text: sub(asString(greeting.text)),
		},
		call_ending: {
			...callEnding,
			farewell_message: sub(asString(callEnding.farewell_message)),
		},
	};
}

function substituteDeepStrings(
	value: unknown,
	values: Record<string, unknown>,
	singleBraceKeys: ReadonlySet<string>,
): unknown {
	if (typeof value === "string") {
		return substituteTemplate(value, values, singleBraceKeys);
	}
	if (Array.isArray(value)) {
		return value.map((item) =>
			substituteDeepStrings(item, values, singleBraceKeys),
		);
	}
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [key, nested] of Object.entries(
			value as Record<string, unknown>,
		)) {
			out[key] = substituteDeepStrings(nested, values, singleBraceKeys);
		}
		return out;
	}
	return value;
}

function prepareToolDefinitions(
	toolDefinitions: ReadonlyArray<Record<string, unknown>>,
	values: Record<string, unknown>,
	singleBraceKeys: ReadonlySet<string>,
): Record<string, unknown>[] {
	return toolDefinitions.map((tool) => {
		const substituted = substituteDeepStrings(
			tool,
			values,
			singleBraceKeys,
		) as Record<string, unknown>;
		return {
			id: asString(substituted.id),
			name: asString(substituted.name),
			description: asString(substituted.description),
			tool_type:
				substituted.tool_type === "python" ? "python" : "http",
			config: asRecord(substituted.config),
			parameters_schema: asRecord(substituted.parameters_schema),
		};
	});
}

/**
 * Collapse prompt sections into `config.instructions` with variables resolved.
 * Clears `prompts` and embeds resolved `tool_definitions` for the worker.
 */
export function prepareConfigForDispatch(
	config: Record<string, unknown>,
	contactMetadata: Record<string, unknown> = {},
	options: {
		toolDefinitions?: ReadonlyArray<Record<string, unknown>>;
	} = {},
): Record<string, unknown> {
	const environmentVariables = Object.fromEntries(
		Object.entries(asRecord(config.environment_variables)).map(
			([key, value]) => [key, formatValue(value)],
		),
	) as Record<string, string>;

	const values = buildTemplateValues(contactMetadata, environmentVariables);
	const singleBraceKeys = variableNames(config);
	const substituted = substituteConfigTextFields(
		config,
		values,
		singleBraceKeys,
	);
	const instructions = mergePromptSections(substituted);
	const toolDefinitions = prepareToolDefinitions(
		options.toolDefinitions ?? [],
		values,
		singleBraceKeys,
	);

	return {
		...substituted,
		instructions,
		prompts: { ...EMPTY_PROMPT_SECTIONS },
		tool_definitions: toolDefinitions,
	};
}
