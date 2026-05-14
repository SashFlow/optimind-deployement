import { db } from "../client";

export async function getRegisteredUsers({
	limit,
	offset,
	query,
}: {
	limit: number;
	offset: number;
	query?: string;
}) {
	return db.registeredUsers.findMany({
		where: {
			full_name: { contains: query, mode: "insensitive" },
		},
		take: limit,
		skip: offset,
	});
}

export async function getAppointments({
	limit,
	offset,
	query,
}: {
	limit: number;
	offset: number;
	query?: string;
}) {
	return db.appointments.findMany({
		where: {
			full_name: { contains: query, mode: "insensitive" },
		},
		take: limit,
		skip: offset,
	});
}

export async function deleteAppointments(id: string) {
	return db.appointments.findMany({
		where: {
			id,
		},
	});
}

export async function createRegisterUser({
	full_name,
	phone_number,
	dob,
}: {
	full_name: string;
	phone_number: string;
	dob: string;
}) {
	return db.registeredUsers.create({
		data: {
			full_name,
			phone_number,
			dob,
		},
	});
}
