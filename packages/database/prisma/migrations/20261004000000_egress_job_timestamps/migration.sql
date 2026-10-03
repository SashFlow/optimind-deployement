-- Persist LiveKit egress start/end times on each egress job (including TRACK).
ALTER TABLE "public"."egress_job"
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "endedAt" TIMESTAMP(3);
