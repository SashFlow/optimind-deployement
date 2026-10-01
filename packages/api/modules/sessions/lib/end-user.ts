import { createEphemeralEndUser, upsertEndUser } from "@repo/database";
import type { DispatchEndUser } from "./merge-prompt";

type Base = { organizationId: string; agentId: string };

export type EndUserSource =
	/** Logged-in platform user: one end user per (agent, user). */
	| {
			kind: "user";
			user: { id: string; name?: string | null; email?: string | null };
	  }
	/** Phone contact: one end user per (agent, E.164 number). */
	| {
			kind: "phone";
			phone: string;
			contactMetadata?: Record<string, unknown>;
	  }
	/** Trial link visitor: a new end user every session. */
	| {
			kind: "trial";
			trial: { id: string; label: string };
			name?: string | null;
			email?: string | null;
			phone?: string | null;
			variables?: Record<string, unknown>;
	  }
	/** Anonymous web visitor: a new end user every session. */
	| { kind: "anonymous"; name?: string | null }
	/** Embed visitor with a stable external id: upsert by identity. */
	| {
			kind: "external";
			externalId: string;
			name?: string | null;
			metadata?: Record<string, unknown>;
	  };

function contactName(contactMetadata: Record<string, unknown> = {}) {
	for (const key of ["name", "full_name", "customer_name", "contact_name"]) {
		const value = contactMetadata[key];
		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}
	return null;
}

/** Resolve (find or create) the end user a new agent session belongs to. */
export async function resolveSessionEndUser(base: Base, source: EndUserSource) {
	switch (source.kind) {
		case "user":
			return upsertEndUser({
				...base,
				identity: `user:${source.user.id}`,
				name: source.user.name?.trim() || source.user.email || "User",
				email: source.user.email ?? null,
				metadata: { source: "user", userId: source.user.id },
			});
		case "phone":
			return upsertEndUser({
				...base,
				identity: `phone:${source.phone}`,
				name: contactName(source.contactMetadata) ?? source.phone,
				phone: source.phone,
				metadata: { source: "phone" },
			});
		case "trial":
			return createEphemeralEndUser({
				...base,
				identityPrefix: `trial:${source.trial.id}`,
				name: source.name?.trim() || "Guest",
				email: source.email?.trim() || null,
				phone: source.phone ?? null,
				metadata: {
					source: "trial_link",
					trialId: source.trial.id,
					trialLabel: source.trial.label,
					variables: source.variables ?? {},
				},
			});
		case "anonymous":
			return createEphemeralEndUser({
				...base,
				identityPrefix: "anon",
				name: source.name?.trim() || "Guest",
				metadata: { source: "anonymous" },
			});
		case "external":
			return upsertEndUser({
				...base,
				identity: `external:${source.externalId}`,
				name:
					source.name?.trim() ||
					contactName(source.metadata) ||
					"Guest",
				metadata: {
					source: "embed",
					externalId: source.externalId,
					...(source.metadata ?? {}),
				},
			});
	}
}

export function toDispatchEndUser(endUser: {
	id: string;
	name: string;
	memory: string[];
}): DispatchEndUser {
	return { id: endUser.id, name: endUser.name, memory: endUser.memory };
}
