-- Add human-readable label for agent trial links
ALTER TABLE "agent_trial"
ADD COLUMN "label" TEXT NOT NULL DEFAULT '';
