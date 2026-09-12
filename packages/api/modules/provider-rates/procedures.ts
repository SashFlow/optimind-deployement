import { ORPCError } from "@orpc/client";
import {
	createProviderRate,
	deleteProviderRate,
	listProviderRates,
	updateProviderRate,
} from "@repo/database";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";

const modalityEnum = z.enum([
	"LLM",
	"REALTIME",
	"STT",
	"TTS",
	"VAD",
	"AVATAR",
	"SIP",
	"LIVEKIT_ROOM",
	"EGRESS",
]);

const unitEnum = z.enum(["TOKEN", "MINUTE", "CHARACTER", "REQUEST"]);

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/provider-rates",
		tags: ["ProviderRates"],
		summary: "List provider rates (org + platform defaults)",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const rates = await listProviderRates({
			organizationId: input.organizationId,
			includePlatformDefaults: true,
		});
		return { rates };
	});

export const create = protectedProcedure
	.route({
		method: "POST",
		path: "/provider-rates",
		tags: ["ProviderRates"],
		summary: "Create an organization provider rate",
	})
	.input(
		z.object({
			organizationId: z.string(),
			modality: modalityEnum,
			provider: z.string().min(1),
			model: z.string().nullable().optional(),
			unit: unitEnum,
			unitAmountMicros: z.number().int().nonnegative(),
			currency: z.string().default("USD"),
			unitSource: z
				.enum(["LIVEKIT_INFERENCE", "BYOK", "PLATFORM"])
				.nullable()
				.optional(),
			effectiveFrom: z.coerce.date().optional(),
			effectiveTo: z.coerce.date().nullable().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const rate = await createProviderRate({
			organizationId: input.organizationId,
			modality: input.modality,
			provider: input.provider,
			model: input.model,
			unit: input.unit,
			unitAmountMicros: input.unitAmountMicros,
			currency: input.currency,
			unitSource: input.unitSource,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: input.effectiveTo,
		});
		return { rate };
	});

export const update = protectedProcedure
	.route({
		method: "PATCH",
		path: "/provider-rates/{id}",
		tags: ["ProviderRates"],
		summary: "Update a provider rate",
	})
	.input(
		z.object({
			id: z.string(),
			organizationId: z.string(),
			unitAmountMicros: z.number().int().nonnegative().optional(),
			currency: z.string().optional(),
			model: z.string().nullable().optional(),
			unit: unitEnum.optional(),
			unitSource: z
				.enum(["LIVEKIT_INFERENCE", "BYOK", "PLATFORM"])
				.nullable()
				.optional(),
			effectiveTo: z.coerce.date().nullable().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const existing = await listProviderRates({
			organizationId: input.organizationId,
			includePlatformDefaults: false,
		});
		const owned = existing.find((r) => r.id === input.id);
		if (!owned) {
			throw new ORPCError("NOT_FOUND", {
				message: "Rate not found or not owned by organization",
			});
		}
		const rate = await updateProviderRate(input.id, {
			unitAmountMicros: input.unitAmountMicros,
			currency: input.currency,
			model: input.model,
			unit: input.unit,
			unitSource: input.unitSource,
			effectiveTo: input.effectiveTo,
		});
		return { rate };
	});

export const remove = protectedProcedure
	.route({
		method: "DELETE",
		path: "/provider-rates/{id}",
		tags: ["ProviderRates"],
		summary: "Delete an organization provider rate",
	})
	.input(
		z.object({
			id: z.string(),
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const existing = await listProviderRates({
			organizationId: input.organizationId,
			includePlatformDefaults: false,
		});
		const owned = existing.find((r) => r.id === input.id);
		if (!owned) {
			throw new ORPCError("NOT_FOUND", {
				message: "Rate not found or not owned by organization",
			});
		}
		await deleteProviderRate(input.id);
		return { ok: true };
	});
