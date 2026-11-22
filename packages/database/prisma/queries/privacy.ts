import { db } from "../client";

export async function exportPlatformUserData(userId: string) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			email: true,
			emailVerified: true,
			image: true,
			username: true,
			locale: true,
			createdAt: true,
			updatedAt: true,
			twoFactorEnabled: true,
			members: {
				select: {
					role: true,
					organizationId: true,
					organization: {
						select: { id: true, name: true, slug: true },
					},
				},
			},
			sessions: {
				select: {
					id: true,
					createdAt: true,
					expiresAt: true,
					ipAddress: true,
					userAgent: true,
				},
				take: 50,
				orderBy: { createdAt: "desc" },
			},
		},
	});
	return user;
}

export async function exportEndUserData(endUserId: string) {
	return db.endUser.findUnique({
		where: { id: endUserId },
		include: {
			agent: { select: { id: true, name: true } },
			sessions: {
				include: {
					transcript: {
						select: {
							id: true,
							fullText: true,
							language: true,
							createdAt: true,
							retentionExpiresAt: true,
						},
					},
					files: true,
					egressJobs: {
						select: {
							id: true,
							fileUrl: true,
							outputUrls: true,
							type: true,
							status: true,
							createdAt: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			},
		},
	});
}

export async function eraseEndUserData(endUserId: string) {
	const endUser = await db.endUser.findUnique({
		where: { id: endUserId },
		include: {
			sessions: {
				include: {
					files: true,
					egressJobs: true,
					transcript: true,
				},
			},
		},
	});
	if (!endUser) {
		return null;
	}

	const storageKeys: Array<{ key: string; hint?: string }> = [];
	for (const key of endUser.files) {
		storageKeys.push({ key, hint: "end_user_files" });
	}
	for (const session of endUser.sessions) {
		for (const file of session.files) {
			storageKeys.push({ key: file.url, hint: "session_file" });
		}
		for (const job of session.egressJobs) {
			for (const url of job.outputUrls) {
				storageKeys.push({ key: url, hint: "egress" });
			}
			if (job.fileUrl) {
				storageKeys.push({ key: job.fileUrl, hint: "egress" });
			}
		}
		if (session.transcript?.storageUri) {
			storageKeys.push({
				key: session.transcript.storageUri,
				hint: "transcript",
			});
		}
	}

	await db.endUser.delete({ where: { id: endUserId } });
	return { organizationId: endUser.organizationId, storageKeys };
}

export async function listExpiredTranscripts(limit = 100) {
	return db.transcript.findMany({
		where: {
			retentionExpiresAt: { lte: new Date() },
		},
		include: {
			session: {
				include: {
					files: true,
					egressJobs: true,
				},
			},
		},
		take: limit,
		orderBy: { retentionExpiresAt: "asc" },
	});
}

export async function purgeExpiredTranscriptRecord(transcriptId: string) {
	const transcript = await db.transcript.findUnique({
		where: { id: transcriptId },
		include: {
			session: {
				include: { files: true, egressJobs: true },
			},
		},
	});
	if (!transcript) {
		return null;
	}

	const storageKeys: string[] = [];
	if (transcript.storageUri) {
		storageKeys.push(transcript.storageUri);
	}
	for (const file of transcript.session.files) {
		storageKeys.push(file.url);
	}
	for (const job of transcript.session.egressJobs) {
		storageKeys.push(...job.outputUrls);
		if (job.fileUrl) {
			storageKeys.push(job.fileUrl);
		}
	}

	await db.transcript.update({
		where: { id: transcriptId },
		data: {
			fullText: "",
			wordCount: 0,
			storageUri: null,
			status: "FINAL",
			retentionExpiresAt: null,
		},
	});
	await db.transcriptSegment.deleteMany({
		where: { transcriptId },
	});
	await db.sessionFile.deleteMany({
		where: { sessionId: transcript.sessionId },
	});

	return {
		organizationId: transcript.organizationId,
		sessionId: transcript.sessionId,
		storageKeys,
	};
}
