import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { updateDemoLink } from "@repo/database";

export const updateLink = protectedProcedure
    .route({
        method: "POST",
        path: "/links/update",
        tags: ["Links"],
        summary: "Update Link",
    })
    .input(
        z.object({
            id: z.string(),
            client: z.string(),
            description: z.string(),
            slug: z.string(),
            mode: z.string(),
            sessions: z.int(),
            published: z.boolean().optional(),
            approvedSessions: z.int().optional(),
        }),
    )
    .handler(async ({ input }) => {
        try {
            await updateDemoLink(input);
        } catch (error) {
            logger.error(error);
            throw new ORPCError("INTERNAL_SERVER_ERROR");
        }
    });


export const disableLink = protectedProcedure
    .route({
        method: "POST",
        path: "/links/update/disable",
        tags: ["Links"],
        summary: "Disable Link",
    })
    .input(
        z.object({
            id: z.string(),
            approvedSessions: z.int(),
        }),
    )
    .handler(async ({ input }) => {
        try {
            await updateDemoLink(input);
        } catch (error) {
            logger.error(error);
            throw new ORPCError("INTERNAL_SERVER_ERROR");
        }
    });

export const enableLink = protectedProcedure
    .route({
        method: "POST",
        path: "/links/update/enable",
        tags: ["Links"],
        summary: "Enable Link",
    })
    .input(
        z.object({
            id: z.string(),
            published: z.boolean(),
        }),
    )
    .handler(async ({ input }) => {
        try {
            await updateDemoLink(input);
        } catch (error) {
            logger.error(error);
            throw new ORPCError("INTERNAL_SERVER_ERROR");
        }
    });

