import { z } from "zod";

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

export function buildDispatchMetadata(
	input: z.input<typeof dispatchMetadataSchema>,
): DispatchMetadata {
	return dispatchMetadataSchema.parse(input);
}

export function serializeDispatchMetadata(metadata: DispatchMetadata): string {
	return JSON.stringify(metadata);
}
