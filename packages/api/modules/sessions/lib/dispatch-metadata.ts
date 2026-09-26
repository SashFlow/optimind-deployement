import { z } from "zod";
import { AVATARS_PROVIDERS } from "../../catalog/data";
import {
	collectDispatchToolIds,
	resolveOrgToolsByIds,
} from "../../tools/lib/org-tools";
import { prepareConfigForDispatch } from "./merge-prompt";

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
	recording_enabled: z.boolean().default(false),
});

export type DispatchMetadata = z.infer<typeof dispatchMetadataSchema>;

/**
 * Ensure `config.avatar.provider_id` is set so the worker knows which avatar
 * plugin (anam / spatialreal) to start. Catalog avatars resolve their provider
 * from the catalog; older configs may have saved the avatar id without one.
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
	if (typeof externalAvatarId !== "string" || !externalAvatarId) {
		return config;
	}

	const catalogProviderId = AVATARS_PROVIDERS.find((provider) =>
		provider.avatars.some((item) => item.id === externalAvatarId),
	)?.id;
	const providerId =
		catalogProviderId ??
		(typeof avatarRecord.provider_id === "string"
			? avatarRecord.provider_id
			: null);

	return {
		...config,
		avatar: { ...avatarRecord, provider_id: providerId },
	};
}

/**
 * Build dispatch metadata with:
 * - mega prompt in config.instructions (variables substituted)
 * - full tool definitions in config.tool_definitions (resolved from org tools by ID)
 */
export async function buildDispatchMetadata(
	input: z.input<typeof dispatchMetadataSchema>,
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
		}),
		contact_metadata: contactMetadata,
	});
}

export function serializeDispatchMetadata(metadata: DispatchMetadata): string {
	return JSON.stringify(metadata);
}

export { prepareConfigForDispatch } from "./merge-prompt";
