import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { createDemoLink } from "@repo/database";

export const createLink = protectedProcedure
    .route({
        method: "POST",
        path: "/links/create",
        tags: ["Links"],
        summary: "Create Link",
    })
    .input(
        z.object({
            client: z.string(),
            description: z.string(),
            slug: z.string(),
            mode: z.string(),
            sessions: z.int(),
        }),
    )
    .handler(async ({ input }) => {
        const { client, description, slug, mode, sessions } = input;

        try {
            return await createDemoLink(
                client,
                description,
                slug,
                mode,
                sessions);
        } catch (error) {
            logger.error(error);
            throw new ORPCError("INTERNAL_SERVER_ERROR");
        }
    });
