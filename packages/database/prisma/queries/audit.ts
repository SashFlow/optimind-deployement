import type {
	AuditActionType,
	AuditActorType,
	Prisma,
} from "../generated/client";
import { db } from "../client";

export type WriteAuditLogInput = {
	organizationId: string;
	actionType: AuditActionType;
	resourceType: string;
	resourceId: string;
	actorType?: AuditActorType;
	userId?: string | null;
	requestId?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	before?: Prisma.InputJsonValue;
	after?: Prisma.InputJsonValue;
};

export async function writeAuditLog(data: WriteAuditLogInput) {
	return db.auditLog.create({
		data: {
			organizationId: data.organizationId,
			actionType: data.actionType,
			resourceType: data.resourceType,
			resourceId: data.resourceId,
			actorType: data.actorType ?? "USER",
			userId: data.userId ?? null,
			requestId: data.requestId ?? null,
			ipAddress: data.ipAddress ?? null,
			userAgent: data.userAgent ?? null,
			before: data.before ?? {},
			after: data.after ?? {},
		},
	});
}

export async function listAuditLogs(
	organizationId: string,
	opts?: {
		actionType?: AuditActionType;
		resourceType?: string;
		limit?: number;
		offset?: number;
	},
) {
	const limit = opts?.limit ?? 100;
	const offset = opts?.offset ?? 0;

	const where: Prisma.AuditLogWhereInput = {
		organizationId,
		...(opts?.actionType ? { actionType: opts.actionType } : {}),
		...(opts?.resourceType ? { resourceType: opts.resourceType } : {}),
	};

	const [rows, total] = await Promise.all([
		db.auditLog.findMany({
			where,
			orderBy: { createdAt: "desc" },
			take: limit,
			skip: offset,
			select: {
				id: true,
				createdAt: true,
				actionType: true,
				resourceType: true,
				resourceId: true,
				userId: true,
				ipAddress: true,
				actorType: true,
			},
		}),
		db.auditLog.count({ where }),
	]);

	return { rows, total };
}
