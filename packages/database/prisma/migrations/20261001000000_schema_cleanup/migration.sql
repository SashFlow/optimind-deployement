-- Schema cleanup: one draft + one published version per agent (isDraft only),
-- and drop tables that are no longer used.

-- 1. Sessions no longer reference agent versions (history lives in configSnapshot).
ALTER TABLE "public"."agent_session" DROP CONSTRAINT "agent_session_agentVersionId_fkey";
ALTER TABLE "public"."agent_session" DROP COLUMN "agentVersionId";

-- 2. Make isDraft consistent with the agent's draft/published pointers.
UPDATE "public"."agent_version" v
SET "isDraft" = false
FROM "public"."agent" a
WHERE a."publishedVersionId" = v."id";

UPDATE "public"."agent_version" v
SET "isDraft" = true
FROM "public"."agent" a
WHERE a."draftVersionId" = v."id";

-- 3. Keep only the current draft and published copy of each agent.
DELETE FROM "public"."agent_version" v
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."agent" a
    WHERE a."draftVersionId" = v."id" OR a."publishedVersionId" = v."id"
);

-- 4. isDraft replaces the version status enum.
ALTER TABLE "public"."agent_version" DROP COLUMN "version";
DROP TYPE "public"."AgentVersionStatus";

CREATE UNIQUE INDEX "agent_version_agentId_isDraft_key" ON "public"."agent_version"("agentId", "isDraft");

-- 5. Drop unused tables (provider rates now come from constants).
DROP TABLE "public"."custom_voice";
DROP TABLE "public"."provider_rate";
DROP TABLE "public"."session_collected_field";
DROP TABLE "public"."usage_metric";

DROP TYPE "public"."ProviderRateUnit";
DROP TYPE "public"."UsageMetricSource";
DROP TYPE "public"."UsageMetricCategory";
