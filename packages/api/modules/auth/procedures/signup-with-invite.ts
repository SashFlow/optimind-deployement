import { ORPCError } from "@orpc/server";
import { signupWithInvitation, verifyRecaptchaToken } from "@repo/auth";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";

export const signupWithInvite = publicProcedure
	.route({
		method: "POST",
		path: "/auth/signup-with-invitation",
		tags: ["Auth"],
		summary:
			"Sign up by consuming a pending invitation (server uses invitation email/role/org)",
	})
	.input(
		z.object({
			invitationId: z.string().min(1),
			name: z.string().min(1),
			password: z.string().min(8),
			captchaToken: z.string().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const captcha = await verifyRecaptchaToken({
			token: input.captchaToken,
			expectedAction: "signup_invite",
		});
		if (!captcha.ok) {
			throw new ORPCError("FORBIDDEN", {
				message: captcha.message,
			});
		}

		try {
			return await signupWithInvitation({
				invitationId: input.invitationId,
				name: input.name,
				password: input.password,
			});
		} catch (error) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					error instanceof Error
						? error.message
						: "Unable to complete signup.",
			});
		}
	});
