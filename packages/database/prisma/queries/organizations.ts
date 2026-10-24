import type { z } from "zod";
import { db } from "../client";
import type { OrganizationSchema } from "../zod";

/** Workspace vs Trial classification stored in Better Auth `metadata` JSON. */
export type OrganizationKind = "trial" | "workspace";

export function parseOrganizationMetadata(
	metadata: string | Record<string, unknown> | null | undefined,
): { trial: boolean } {
	if (!metadata) {
		return { trial: false };
	}
	try {
		const parsed =
			typeof metadata === "string"
				? (JSON.parse(metadata) as { trial?: boolean })
				: (metadata as { trial?: boolean });
		return { trial: Boolean(parsed.trial) };
	} catch {
		return { trial: false };
	}
}

export function isTrialOrganization(
	metadata: string | Record<string, unknown> | null | undefined,
): boolean {
	return parseOrganizationMetadata(metadata).trial;
}

export function organizationKindFromMetadata(
	metadata: string | Record<string, unknown> | null | undefined,
): OrganizationKind {
	return isTrialOrganization(metadata) ? "trial" : "workspace";
}

export function organizationMetadataForKind(
	kind: OrganizationKind,
	existing?: string | Record<string, unknown> | null,
): Record<string, unknown> {
	const base =
		typeof existing === "string"
			? (() => {
					try {
						return JSON.parse(existing) as Record<string, unknown>;
					} catch {
						return {};
					}
				})()
			: existing && typeof existing === "object"
				? { ...existing }
				: {};
	if (kind === "trial") {
		base.trial = true;
	} else {
		delete base.trial;
	}
	return base;
}

export async function getOrganizations({
	limit,
	offset,
	query,
}: {
	limit: number;
	offset: number;
	query?: string;
}) {
	return db.organization
		.findMany({
			where: {
				name: { contains: query, mode: "insensitive" },
			},
			include: {
				_count: {
					select: {
						members: true,
					},
				},
			},
			take: limit,
			skip: offset,
		})
		.then((res) =>
			res.map((org) => ({
				...org,
				membersCount: org._count.members,
			})),
		);
}

export async function countAllOrganizations() {
	return db.organization.count();
}

export async function getOrganizationById(id: string) {
	return db.organization.findUnique({
		where: { id },
		include: {
			members: true,
			invitations: true,
		},
	});
}

export async function getOrganizationBySlug(slug: string) {
	return db.organization.findUnique({
		where: { slug },
	});
}

export async function getOrganizationMembership(
	organizationId: string,
	userId: string,
) {
	return db.member.findUnique({
		where: {
			organizationId_userId: {
				organizationId,
				userId,
			},
		},
		include: {
			organization: true,
		},
	});
}

export async function getOrganizationWithPurchasesAndMembersCount(
	organizationId: string,
) {
	const organization = await db.organization.findUnique({
		where: {
			id: organizationId,
		},
		include: {
			purchases: true,
			_count: {
				select: {
					members: true,
				},
			},
		},
	});

	return organization
		? {
				...organization,
				membersCount: organization._count.members,
			}
		: null;
}

export async function updateOrganization(
	organization: Partial<z.infer<typeof OrganizationSchema>> & { id: string },
) {
	return db.organization.update({
		where: {
			id: organization.id,
		},
		data: organization,
	});
}
