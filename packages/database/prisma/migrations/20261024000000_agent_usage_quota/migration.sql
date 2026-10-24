-- Per-agent session quota for Trial organizations.
ALTER TABLE "public"."agent"
ADD COLUMN "usageLimit" INTEGER,
ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0;
