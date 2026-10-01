-- End users: every agent session links to an end_user; workers can attach files.

-- 1. Sessions: replace the unused externalUserId with an end_user link.
ALTER TABLE "public"."agent_session" DROP COLUMN "externalUserId",
ADD COLUMN "endUserId" TEXT;

-- 2. New tables.
CREATE TABLE "public"."end_user" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "memory" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "end_user_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."session_file" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "session_file_pkey" PRIMARY KEY ("id")
);

-- 3. Indexes.
CREATE UNIQUE INDEX "end_user_agentId_identity_key" ON "public"."end_user"("agentId", "identity");
CREATE INDEX "end_user_organizationId_idx" ON "public"."end_user"("organizationId");
CREATE INDEX "end_user_agentId_idx" ON "public"."end_user"("agentId");
CREATE INDEX "end_user_organizationId_phone_idx" ON "public"."end_user"("organizationId", "phone");
CREATE INDEX "session_file_organizationId_sessionId_idx" ON "public"."session_file"("organizationId", "sessionId");
CREATE INDEX "agent_session_endUserId_idx" ON "public"."agent_session"("endUserId");

-- 4. Foreign keys.
ALTER TABLE "public"."agent_session" ADD CONSTRAINT "agent_session_endUserId_fkey" FOREIGN KEY ("endUserId") REFERENCES "public"."end_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."end_user" ADD CONSTRAINT "end_user_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."end_user" ADD CONSTRAINT "end_user_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."session_file" ADD CONSTRAINT "session_file_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."session_file" ADD CONSTRAINT "session_file_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
