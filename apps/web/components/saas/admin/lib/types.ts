export type Role = "admin" | "user";

export type Account = {
	id: string;
	name: string;
	email: string;
	role: Role;
	is_active: boolean;
	invite_pending: boolean;
	created_at: string | null;
	last_login_at: string | null;
};

export type AdminOrganization = {
	id: string;
	name: string;
	slug: string | null;
	trial: boolean;
	created_at: string | null;
	membersCount?: number;
};

export type OrganizationMember = {
	account_id: string;
	name: string | null;
	email: string | null;
	role: string;
};

export type AuditLogRow = {
	id: string;
	occurred_at: string;
	action: string;
	resource_type: string;
	resource_id: string | null;
	actor_account_id: string | null;
	ip: string | null;
};

export type BackgroundJobRow = {
	id: string;
	created_at: string | null;
	job_type: string;
	status: string;
	resource_type: string | null;
	resource_id: string | null;
	error: string | null;
};

export function mapUserToAccount(user: {
	id: string;
	name: string;
	email: string;
	role?: string | null;
	banned?: boolean | null;
	emailVerified?: boolean;
	createdAt?: Date | string | null;
}): Account {
	const role: Role = user.role === "admin" ? "admin" : "user";
	return {
		id: user.id,
		name: user.name || user.email,
		email: user.email,
		role,
		is_active: !user.banned,
		invite_pending: user.emailVerified === false,
		created_at: user.createdAt
			? new Date(user.createdAt).toISOString()
			: null,
		last_login_at: null,
	};
}

export function mapOrgToAdminOrganization(org: {
	id: string;
	name: string;
	slug?: string | null;
	createdAt?: Date | string | null;
	metadata?: string | null;
	membersCount?: number;
}): AdminOrganization {
	let trial = false;
	if (org.metadata) {
		try {
			const parsed = JSON.parse(org.metadata) as { trial?: boolean };
			trial = Boolean(parsed.trial);
		} catch {
			trial = false;
		}
	}
	return {
		id: org.id,
		name: org.name,
		slug: org.slug ?? null,
		trial,
		created_at: org.createdAt
			? new Date(org.createdAt).toISOString()
			: null,
		membersCount: org.membersCount,
	};
}
