import { z } from "zod";
import { AVATARS_PROVIDERS } from "../../catalog/data";
import {
	collectDispatchToolIds,
	resolveOrgToolsByIds,
} from "../../tools/lib/org-tools";
import { type DispatchEndUser, prepareConfigForDispatch } from "./merge-prompt";

export const dispatchSourceSchema = z.enum([
	"web",
	"campaign",
	"reschedule",
	"inbound",
	"phone",
]);

export const dispatchMetadataSchema = z.object({
	organization_id: z.string().min(1),
	agent_id: z.string().min(1),
	agent_version_id: z.string().min(1),
	session_id: z.string().min(1),
	config: z.record(z.string(), z.unknown()).default({}),
	source: dispatchSourceSchema.default("web"),
	campaign_id: z.string().nullable().optional(),
	campaign_contact_id: z.string().nullable().optional(),
	phone_number: z.string().nullable().optional(),
	from_number: z.string().nullable().optional(),
	sip_trunk_id: z.string().nullable().optional(),
	livekit_sip_trunk_id: z.string().nullable().optional(),
	direction: z.enum(["NONE", "INBOUND", "OUTBOUND", "WEB"]).default("NONE"),
	channel: z.enum(["WEB", "SIP", "PHONE"]).default("WEB"),
	contact_metadata: z.record(z.string(), z.unknown()).default({}),
	end_user: z
		.object({ id: z.string().min(1), name: z.string() })
		.nullable()
		.optional(),
	recording_enabled: z.boolean().default(false),
});

export type DispatchMetadata = z.infer<typeof dispatchMetadataSchema>;

/**
 * Resolve which avatar provider (anam / spatialreal / spatius / arkit) an
 * avatar id belongs to. Catalog avatars resolve from the catalog; older configs
 * may have saved the avatar id without a provider id, so fall back to whatever
 * was stored.
 */
export function resolveAvatarProviderId(
	externalAvatarId: unknown,
	savedProviderId: unknown,
): string | null {
	if (typeof externalAvatarId !== "string" || !externalAvatarId) {
		return typeof savedProviderId === "string" ? savedProviderId : null;
	}

	const catalogProviderId = AVATARS_PROVIDERS.find((provider) =>
		provider.avatars.some((item) => item.id === externalAvatarId),
	)?.id;

	return (
		catalogProviderId ??
		(typeof savedProviderId === "string" ? savedProviderId : null)
	);
}

function isInworldTtsConfig(config: Record<string, unknown>): boolean {
	const tts = config.tts;
	if (!tts || typeof tts !== "object" || Array.isArray(tts)) {
		return false;
	}
	const ttsRecord = tts as Record<string, unknown>;
	const modelId =
		(typeof ttsRecord.provider_model_id === "string"
			? ttsRecord.provider_model_id
			: null) ||
		(typeof ttsRecord.model_id === "string" ? ttsRecord.model_id : null) ||
		"";
	return modelId.startsWith("inworld-");
}

/**
 * Ensure `config.avatar.provider_id` is set so the worker knows which avatar
 * plugin (or client-rendered ARKit path) to use. Strip ARKit when TTS is not
 * Inworld so share/session starts cannot bypass the configure UI.
 */
function resolveAvatarProvider(
	config: Record<string, unknown>,
): Record<string, unknown> {
	const avatar = config.avatar;
	if (!avatar || typeof avatar !== "object" || Array.isArray(avatar)) {
		return config;
	}

	const avatarRecord = avatar as Record<string, unknown>;
	const externalAvatarId = avatarRecord.external_avatar_id;
	const providerId = resolveAvatarProviderId(
		externalAvatarId,
		avatarRecord.provider_id,
	);

	if (
		avatarRecord.enabled &&
		providerId === "arkit" &&
		!isInworldTtsConfig(config)
	) {
		return {
			...config,
			avatar: {
				...avatarRecord,
				enabled: false,
				provider_id: providerId,
			},
		};
	}

	if (typeof externalAvatarId !== "string" || !externalAvatarId) {
		return config;
	}

	return {
		...config,
		avatar: {
			...avatarRecord,
			provider_id: providerId,
		},
	};
}

/**
 * Build dispatch metadata with:
 * - mega prompt in config.instructions (variables substituted)
 * - full tool definitions in config.tool_definitions (resolved from org tools by ID)
 */
export async function buildDispatchMetadata(
	input: Omit<z.input<typeof dispatchMetadataSchema>, "end_user"> & {
		end_user?: DispatchEndUser | null;
	},
): Promise<DispatchMetadata> {
	const contactMetadata = input.contact_metadata ?? {};
	const rawConfig = resolveAvatarProvider(
		input.config && typeof input.config === "object"
			? (input.config as Record<string, unknown>)
			: {},
	);

	const toolIds = collectDispatchToolIds(rawConfig);
	const toolDefinitions = await resolveOrgToolsByIds(
		input.organization_id,
		toolIds,
	);

	return dispatchMetadataSchema.parse({
		...input,
		config: prepareConfigForDispatch(rawConfig, contactMetadata, {
			toolDefinitions,
			endUser: input.end_user ?? undefined,
		}),
		contact_metadata: contactMetadata,
		end_user: input.end_user
			? { id: input.end_user.id, name: input.end_user.name }
			: null,
	});
}

export function serializeDispatchMetadata(metadata: DispatchMetadata): string {
	return JSON.stringify(metadata);
}

export { prepareConfigForDispatch } from "./merge-prompt";
