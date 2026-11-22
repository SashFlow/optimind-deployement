import { type WriteAuditLogInput, writeAuditLog } from "@repo/database";
import { logger } from "@repo/logs";

export type AuditActionType = WriteAuditLogInput["actionType"];
export type AuditActorType = NonNullable<WriteAuditLogInput["actorType"]>;

export type AuditResourceType =
	| "agent"
	| "agent_version"
	| "agent_access"
	| "campaign"
	| "campaign_contacts"
	| "knowledge_source"
	| "phone_number"
	| "sip_trunk"
	| "sip_dispatch_rule"
	| "invite"
	| "organization"
	| "session"
	| "end_user"
	| "transcript"
	| "auth_session"
	| "impersonation";

function firstHeaderValue(value: string | null): string | undefined {
	if (!value) {
		return undefined;
	}
	return value.split(",")[0]?.trim() || undefined;
}

export function getRequestAuditMeta(headers: Headers) {
	return {
		ipAddress:
			firstHeaderValue(headers.get("x-forwarded-for")) ??
			firstHeaderValue(headers.get("x-real-ip")) ??
			undefined,
		userAgent: headers.get("user-agent") ?? undefined,
		requestId:
			headers.get("x-request-id") ??
			headers.get("x-correlation-id") ??
			undefined,
	};
}

const PII_KEYS = new Set([
	"email",
	"phone",
	"phoneE164",
	"aadhaar",
	"aadhaar_number",
	"otp",
	"password",
	"accessToken",
	"refreshToken",
	"token",
]);

function redactValue(key: string, value: unknown): unknown {
	if (PII_KEYS.has(key)) {
		return "[REDACTED]";
	}
	if (Array.isArray(value)) {
		return value.map((item) =>
			typeof item === "object" && item
				? redactObject(item as Record<string, unknown>)
				: item,
		);
	}
	if (value && typeof value === "object") {
		return redactObject(value as Record<string, unknown>);
	}
	return value;
}

function redactObject(
	input: Record<string, unknown> | object | null | undefined,
): Record<string, unknown> {
	if (!input || typeof input !== "object") {
		return {};
	}
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input)) {
		out[key] = redactValue(key, value);
	}
	return out;
}

export async function recordAudit(input: {
	headers: Headers;
	organizationId: string;
	actionType: AuditActionType;
	resourceType: AuditResourceType | string;
	resourceId: string;
	userId?: string | null;
	actorType?: AuditActorType;
	before?: Record<string, unknown> | object | null;
	after?: Record<string, unknown> | object | null;
}) {
	const meta = getRequestAuditMeta(input.headers);
	try {
		await writeAuditLog({
			organizationId: input.organizationId,
			actionType: input.actionType,
			resourceType: input.resourceType,
			resourceId: input.resourceId,
			userId: input.userId,
			actorType: input.actorType ?? (input.userId ? "USER" : "SYSTEM"),
			ipAddress: meta.ipAddress,
			userAgent: meta.userAgent,
			requestId: meta.requestId,
			before: JSON.parse(JSON.stringify(redactObject(input.before))),
			after: JSON.parse(JSON.stringify(redactObject(input.after))),
		});
	} catch (error) {
		logger.error("Failed to write audit log", { error, input });
	}
}
