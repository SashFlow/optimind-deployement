import { v4 as uuidv4 } from "uuid";
import { db } from "../client";
import type { DemoLinks } from "../generated/client";

export async function getDemoLink({
	limit,
	offset,
	query,
}: {
	limit: number;
	offset: number;
	query?: string;
}) {
	return db.demoLinks.findMany({
		where: {
			client: { contains: query, mode: "insensitive" },
		},
		take: limit,
		skip: offset,
	});
}

export async function countAllDemoLink() {
	return db.demoLinks.count();
}

export async function getDemoLinkById(id: string) {
	return db.demoLinks.findUnique({
		where: { id },
	});
}

export async function getDemoLinkByToken(token: string) {
	return db.demoLinks.findUnique({
		where: { token },
	});
}

export async function updateDemoLink(
	demolink: Partial<DemoLinks> & {
		id: string;
	},
) {
	return db.demoLinks.update({
		where: {
			id: demolink.id,
		},
		data: demolink,
	});
}

export async function reduceSession(id: string) {
	return db.demoLinks.update({
		where: {
			id,
		},
		data: {
			approvedSessions: {
				decrement: 1,
			},
		},
	});
}

export async function deleteDemoLink(id: string) {
	const link = await db.demoLinks.findUnique({
		where: { id },
	});
	if (link !== null) {
		await db.demoLinks.delete({
			where: { id },
		});
	}
	return link;
}

export async function createDemoLink(
	client: string,
	description: string,
	slug: string,
	mode: string,
	sessions: number,
) {
	const generatedToken = uuidv4();
	return db.demoLinks.create({
		data: {
			slug,
			mode,
			approvedSessions: sessions,
			client,
			description,
			published: true,
			token: generatedToken,
		},
	});
}
