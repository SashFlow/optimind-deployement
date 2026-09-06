import { ORPCError } from "@orpc/client";
import {
	createSessionToken,
	listAvatars as listAnamAvatars,
	listPersonas as listAnamPersonas,
} from "@repo/anam";
import {
	createAvatarProfile,
	deleteAvatarProfile,
	getAvatarProfileById,
	listAvatarProfiles,
	updateAvatarProfile,
} from "@repo/database";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/avatars",
		tags: ["Avatars"],
		summary: "List avatar profiles",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		return { avatars: await listAvatarProfiles(input.organizationId) };
	});

export const create = protectedProcedure
	.route({
		method: "POST",
		path: "/avatars",
		tags: ["Avatars"],
		summary: "Create avatar profile",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string(),
			anamAvatarId: z.string(),
			anamPersonaId: z.string().optional(),
			previewUrl: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const avatar = await createAvatarProfile(input);
		return { avatar };
	});

export const update = protectedProcedure
	.route({
		method: "PATCH",
		path: "/avatars/{id}",
		tags: ["Avatars"],
		summary: "Update avatar profile",
	})
	.input(
		z.object({
			id: z.string(),
			name: z.string().optional(),
			anamAvatarId: z.string().optional(),
			anamPersonaId: z.string().nullable().optional(),
			previewUrl: z.string().nullable().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const existing = await getAvatarProfileById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);
		const { id, ...data } = input;
		return { avatar: await updateAvatarProfile(id, data) };
	});

export const remove = protectedProcedure
	.route({
		method: "DELETE",
		path: "/avatars/{id}",
		tags: ["Avatars"],
		summary: "Delete avatar profile",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const existing = await getAvatarProfileById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);
		await deleteAvatarProfile(input.id);
		return { success: true };
	});

export const mintSessionToken = protectedProcedure
	.route({
		method: "POST",
		path: "/avatars/session-token",
		tags: ["Avatars"],
		summary: "Mint Anam session token",
	})
	.input(
		z.object({
			organizationId: z.string(),
			avatarProfileId: z.string().optional(),
			personaId: z.string().optional(),
			avatarId: z.string().optional(),
			voiceId: z.string().optional(),
			name: z.string().optional(),
			systemPrompt: z.string().optional(),
			clientLabel: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		if (input.avatarProfileId) {
			const profile = await getAvatarProfileById(input.avatarProfileId);
			if (!profile) throw new ORPCError("NOT_FOUND");
			if (profile.anamPersonaId) {
				const token = await createSessionToken({
					personaConfig: { personaId: profile.anamPersonaId },
					clientLabel: input.clientLabel,
				});
				return token;
			}
			const token = await createSessionToken({
				personaConfig: {
					name: profile.name,
					avatarId: profile.anamAvatarId,
					voiceId: input.voiceId,
					systemPrompt: input.systemPrompt,
				},
				clientLabel: input.clientLabel,
			});
			return token;
		}

		if (input.personaId) {
			return createSessionToken({
				personaConfig: { personaId: input.personaId },
				clientLabel: input.clientLabel,
			});
		}

		if (!input.avatarId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "avatarProfileId, personaId, or avatarId required",
			});
		}

		return createSessionToken({
			personaConfig: {
				name: input.name,
				avatarId: input.avatarId,
				voiceId: input.voiceId,
				systemPrompt: input.systemPrompt,
			},
			clientLabel: input.clientLabel,
		});
	});

export const listRemote = protectedProcedure
	.route({
		method: "GET",
		path: "/avatars/remote",
		tags: ["Avatars"],
		summary: "List Anam personas/avatars",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const [personas, avatars] = await Promise.all([
			listAnamPersonas(),
			listAnamAvatars(),
		]);
		return { personas, avatars };
	});
