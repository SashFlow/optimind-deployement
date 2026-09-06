-- Agents / campaigns / telephony / knowledge / metrics domain tables
-- (pgvector optional later; embeddings stored as JSON arrays for portability)

-- CreateEnum
CREATE TYPE "public"."AuditActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'INVITE', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "public"."AuditActorType" AS ENUM ('USER', 'SYSTEM', 'API');

-- CreateEnum
CREATE TYPE "public"."AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."AgentVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."CampaignMode" AS ENUM ('OUTBOUND_LIST', 'INBOUND_OPEN', 'WEB_LINK');

-- CreateEnum
CREATE TYPE "public"."CampaignChannel" AS ENUM ('VOICE', 'WEB');

-- CreateEnum
CREATE TYPE "public"."CampaignPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."CampaignContactStatus" AS ENUM ('PENDING', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED', 'DO_NOT_CONTACT', 'PAUSED', 'RESCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."CampaignSessionStatus" AS ENUM ('QUEUED', 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED', 'PAUSED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "public"."CampaignSessionDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'WEB');

-- CreateEnum
CREATE TYPE "public"."CampaignAccessLinkKind" AS ENUM ('OPEN', 'PERSONALIZED');

-- CreateEnum
CREATE TYPE "public"."KnowledgeBaseStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."DocumentSourceType" AS ENUM ('UPLOAD', 'URL', 'TEXT', 'API');

-- CreateEnum
CREATE TYPE "public"."SipTrunkDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "public"."EgressJobStatus" AS ENUM ('STARTING', 'ACTIVE', 'ENDING', 'COMPLETE', 'FAILED', 'ABORTED');

-- CreateEnum
CREATE TYPE "public"."EgressJobType" AS ENUM ('ROOM_COMPOSITE', 'PARTICIPANT', 'TRACK', 'WEB');

-- CreateEnum
CREATE TYPE "public"."UsageMetricSource" AS ENUM ('AGENT', 'CAMPAIGN', 'SESSION');

-- CreateEnum
CREATE TYPE "public"."UsageMetricCategory" AS ENUM ('LLM', 'STT', 'TTS', 'AVATAR', 'SIP', 'EGRESS', 'ROOM');


-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorType" "public"."AuditActorType" NOT NULL,
    "actionType" "public"."AuditActionType" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "draftVersionId" TEXT,
    "publishedVersionId" TEXT,
    "embedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT,

    CONSTRAINT "agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent_version" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "version" "public"."AgentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "agent_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent_trial" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "usageLimit" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "agent_trial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaign" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "mode" "public"."CampaignMode" NOT NULL,
    "channel" "public"."CampaignChannel" NOT NULL,
    "priority" "public"."CampaignPriority" NOT NULL DEFAULT 'NORMAL',
    "contextSchema" JSONB NOT NULL DEFAULT '[]',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "timezone" TEXT DEFAULT 'UTC',
    "callingWindowStartHour" INTEGER,
    "callingWindowEndHour" INTEGER,
    "maxConcurrentSessions" INTEGER NOT NULL DEFAULT 1,
    "maxAttemptsPerContact" INTEGER NOT NULL DEFAULT 3,
    "retryDelayMinutes" INTEGER NOT NULL DEFAULT 60,
    "publicToken" TEXT,
    "embedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inboundAddress" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaign_contact" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "displayName" TEXT,
    "phoneE164" TEXT,
    "email" TEXT,
    "timezone" TEXT,
    "locale" TEXT,
    "externalId" TEXT,
    "context" JSONB NOT NULL DEFAULT '{}',
    "status" "public"."CampaignContactStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "lastOutcome" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "consentSource" TEXT,
    "memorySummary" TEXT,
    "memoryUpdatedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "campaign_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaign_access_link" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT,
    "kind" "public"."CampaignAccessLinkKind" NOT NULL,
    "token" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "contextOverrides" JSONB NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "campaign_access_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaign_session" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT,
    "accessLinkId" TEXT,
    "channel" "public"."CampaignChannel" NOT NULL,
    "direction" "public"."CampaignSessionDirection" NOT NULL DEFAULT 'WEB',
    "status" "public"."CampaignSessionStatus" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "contextSnapshot" JSONB NOT NULL DEFAULT '{}',
    "outcome" TEXT,
    "summary" TEXT,
    "transcript" JSONB,
    "messages" JSONB,
    "recordingUrl" TEXT,
    "durationSeconds" INTEGER,
    "livekitRoomName" TEXT,
    "livekitRoomSid" TEXT,
    "parentSessionId" TEXT,
    "egressId" TEXT,
    "egressStatus" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "campaign_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_base" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "embeddingDim" INTEGER NOT NULL DEFAULT 1536,
    "status" "public"."KnowledgeBaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "public"."DocumentSourceType" NOT NULL DEFAULT 'UPLOAD',
    "sourceUrl" TEXT,
    "storageKey" TEXT,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_chunk" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "tokenCount" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" JSONB,

    CONSTRAINT "document_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent_knowledge_base" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,

    CONSTRAINT "agent_knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaign_knowledge_base" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,

    CONSTRAINT "campaign_knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."phone_number" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "agentId" TEXT,
    "sipTrunkId" TEXT,
    "e164" TEXT NOT NULL,
    "plivoNumberId" TEXT,
    "friendlyName" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "phone_number_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sip_trunk" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" "public"."SipTrunkDirection" NOT NULL,
    "livekitTrunkId" TEXT,
    "plivoTrunkId" TEXT,
    "plivoUriId" TEXT,
    "plivoCredentialId" TEXT,
    "authUsername" TEXT,
    "hasCredentials" BOOLEAN NOT NULL DEFAULT false,
    "numbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "sip_trunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dispatch_rule" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sipTrunkId" TEXT,
    "agentId" TEXT,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "livekitDispatchRuleId" TEXT,
    "roomPrefix" TEXT,
    "ruleConfig" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "dispatch_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_voice" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "livekitVoiceId" TEXT,
    "sampleStorageKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "custom_voice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."egress_job" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignSessionId" TEXT,
    "livekitEgressId" TEXT,
    "type" "public"."EgressJobType" NOT NULL,
    "status" "public"."EgressJobStatus" NOT NULL DEFAULT 'STARTING',
    "roomName" TEXT,
    "outputUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "egress_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."avatar_profile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "anamAvatarId" TEXT NOT NULL,
    "anamPersonaId" TEXT,
    "previewUrl" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "avatar_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_metric" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT,
    "campaignId" TEXT,
    "campaignSessionId" TEXT,
    "source" "public"."UsageMetricSource" NOT NULL,
    "category" "public"."UsageMetricCategory" NOT NULL,
    "provider" TEXT,
    "metric" TEXT NOT NULL,
    "value" DECIMAL(20,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "usage_metric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_token_key" ON "public"."agent"("token");

-- CreateIndex
CREATE INDEX "agent_organizationId_idx" ON "public"."agent"("organizationId");

-- CreateIndex
CREATE INDEX "agent_version_agentId_idx" ON "public"."agent_version"("agentId");

-- CreateIndex
CREATE INDEX "agent_version_organizationId_idx" ON "public"."agent_version"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_trial_token_key" ON "public"."agent_trial"("token");

-- CreateIndex
CREATE INDEX "agent_trial_agentId_idx" ON "public"."agent_trial"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_publicToken_key" ON "public"."campaign"("publicToken");

-- CreateIndex
CREATE INDEX "campaign_organizationId_status_idx" ON "public"."campaign"("organizationId", "status");

-- CreateIndex
CREATE INDEX "campaign_agentId_idx" ON "public"."campaign"("agentId");

-- CreateIndex
CREATE INDEX "campaign_mode_status_idx" ON "public"."campaign"("mode", "status");

-- CreateIndex
CREATE INDEX "campaign_contact_campaignId_status_idx" ON "public"."campaign_contact"("campaignId", "status");

-- CreateIndex
CREATE INDEX "campaign_contact_campaignId_nextAttemptAt_idx" ON "public"."campaign_contact"("campaignId", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "campaign_contact_organizationId_idx" ON "public"."campaign_contact"("organizationId");

-- CreateIndex
CREATE INDEX "campaign_contact_phoneE164_idx" ON "public"."campaign_contact"("phoneE164");

-- CreateIndex
CREATE INDEX "campaign_contact_email_idx" ON "public"."campaign_contact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_contact_campaignId_externalId_key" ON "public"."campaign_contact"("campaignId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_access_link_token_key" ON "public"."campaign_access_link"("token");

-- CreateIndex
CREATE INDEX "campaign_access_link_campaignId_kind_idx" ON "public"."campaign_access_link"("campaignId", "kind");

-- CreateIndex
CREATE INDEX "campaign_access_link_contactId_idx" ON "public"."campaign_access_link"("contactId");

-- CreateIndex
CREATE INDEX "campaign_access_link_organizationId_idx" ON "public"."campaign_access_link"("organizationId");

-- CreateIndex
CREATE INDEX "campaign_session_campaignId_status_idx" ON "public"."campaign_session"("campaignId", "status");

-- CreateIndex
CREATE INDEX "campaign_session_contactId_startedAt_idx" ON "public"."campaign_session"("contactId", "startedAt");

-- CreateIndex
CREATE INDEX "campaign_session_accessLinkId_idx" ON "public"."campaign_session"("accessLinkId");

-- CreateIndex
CREATE INDEX "campaign_session_organizationId_startedAt_idx" ON "public"."campaign_session"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "campaign_session_livekitRoomName_idx" ON "public"."campaign_session"("livekitRoomName");

-- CreateIndex
CREATE INDEX "campaign_session_parentSessionId_idx" ON "public"."campaign_session"("parentSessionId");

-- CreateIndex
CREATE INDEX "knowledge_base_organizationId_status_idx" ON "public"."knowledge_base"("organizationId", "status");

-- CreateIndex
CREATE INDEX "document_knowledgeBaseId_status_idx" ON "public"."document"("knowledgeBaseId", "status");

-- CreateIndex
CREATE INDEX "document_chunk_documentId_idx" ON "public"."document_chunk"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_chunk_documentId_chunkIndex_key" ON "public"."document_chunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "agent_knowledge_base_knowledgeBaseId_idx" ON "public"."agent_knowledge_base"("knowledgeBaseId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_knowledge_base_agentId_knowledgeBaseId_key" ON "public"."agent_knowledge_base"("agentId", "knowledgeBaseId");

-- CreateIndex
CREATE INDEX "campaign_knowledge_base_knowledgeBaseId_idx" ON "public"."campaign_knowledge_base"("knowledgeBaseId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_knowledge_base_campaignId_knowledgeBaseId_key" ON "public"."campaign_knowledge_base"("campaignId", "knowledgeBaseId");

-- CreateIndex
CREATE INDEX "phone_number_campaignId_idx" ON "public"."phone_number"("campaignId");

-- CreateIndex
CREATE INDEX "phone_number_agentId_idx" ON "public"."phone_number"("agentId");

-- CreateIndex
CREATE INDEX "phone_number_sipTrunkId_idx" ON "public"."phone_number"("sipTrunkId");

-- CreateIndex
CREATE UNIQUE INDEX "phone_number_organizationId_e164_key" ON "public"."phone_number"("organizationId", "e164");

-- CreateIndex
CREATE INDEX "sip_trunk_organizationId_direction_idx" ON "public"."sip_trunk"("organizationId", "direction");

-- CreateIndex
CREATE INDEX "sip_trunk_livekitTrunkId_idx" ON "public"."sip_trunk"("livekitTrunkId");

-- CreateIndex
CREATE INDEX "dispatch_rule_organizationId_idx" ON "public"."dispatch_rule"("organizationId");

-- CreateIndex
CREATE INDEX "dispatch_rule_sipTrunkId_idx" ON "public"."dispatch_rule"("sipTrunkId");

-- CreateIndex
CREATE INDEX "dispatch_rule_agentId_idx" ON "public"."dispatch_rule"("agentId");

-- CreateIndex
CREATE INDEX "dispatch_rule_campaignId_idx" ON "public"."dispatch_rule"("campaignId");

-- CreateIndex
CREATE INDEX "custom_voice_organizationId_idx" ON "public"."custom_voice"("organizationId");

-- CreateIndex
CREATE INDEX "custom_voice_livekitVoiceId_idx" ON "public"."custom_voice"("livekitVoiceId");

-- CreateIndex
CREATE INDEX "egress_job_organizationId_status_idx" ON "public"."egress_job"("organizationId", "status");

-- CreateIndex
CREATE INDEX "egress_job_campaignSessionId_idx" ON "public"."egress_job"("campaignSessionId");

-- CreateIndex
CREATE INDEX "egress_job_livekitEgressId_idx" ON "public"."egress_job"("livekitEgressId");

-- CreateIndex
CREATE INDEX "avatar_profile_organizationId_idx" ON "public"."avatar_profile"("organizationId");

-- CreateIndex
CREATE INDEX "avatar_profile_anamAvatarId_idx" ON "public"."avatar_profile"("anamAvatarId");

-- CreateIndex
CREATE INDEX "usage_metric_organizationId_recordedAt_idx" ON "public"."usage_metric"("organizationId", "recordedAt");

-- CreateIndex
CREATE INDEX "usage_metric_agentId_recordedAt_idx" ON "public"."usage_metric"("agentId", "recordedAt");

-- CreateIndex
CREATE INDEX "usage_metric_campaignId_recordedAt_idx" ON "public"."usage_metric"("campaignId", "recordedAt");

-- CreateIndex
CREATE INDEX "usage_metric_campaignSessionId_idx" ON "public"."usage_metric"("campaignSessionId");


-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent" ADD CONSTRAINT "agent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent" ADD CONSTRAINT "agent_draftVersionId_fkey" FOREIGN KEY ("draftVersionId") REFERENCES "public"."agent_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent" ADD CONSTRAINT "agent_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "public"."agent_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_version" ADD CONSTRAINT "agent_version_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_version" ADD CONSTRAINT "agent_version_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_trial" ADD CONSTRAINT "agent_trial_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign" ADD CONSTRAINT "campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign" ADD CONSTRAINT "campaign_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_contact" ADD CONSTRAINT "campaign_contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_contact" ADD CONSTRAINT "campaign_contact_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_access_link" ADD CONSTRAINT "campaign_access_link_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_access_link" ADD CONSTRAINT "campaign_access_link_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_access_link" ADD CONSTRAINT "campaign_access_link_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."campaign_contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_session" ADD CONSTRAINT "campaign_session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_session" ADD CONSTRAINT "campaign_session_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_session" ADD CONSTRAINT "campaign_session_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."campaign_contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_session" ADD CONSTRAINT "campaign_session_accessLinkId_fkey" FOREIGN KEY ("accessLinkId") REFERENCES "public"."campaign_access_link"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_session" ADD CONSTRAINT "campaign_session_parentSessionId_fkey" FOREIGN KEY ("parentSessionId") REFERENCES "public"."campaign_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_base" ADD CONSTRAINT "knowledge_base_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document" ADD CONSTRAINT "document_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "public"."knowledge_base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_chunk" ADD CONSTRAINT "document_chunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_knowledge_base" ADD CONSTRAINT "agent_knowledge_base_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_knowledge_base" ADD CONSTRAINT "agent_knowledge_base_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "public"."knowledge_base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_knowledge_base" ADD CONSTRAINT "campaign_knowledge_base_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_knowledge_base" ADD CONSTRAINT "campaign_knowledge_base_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "public"."knowledge_base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."phone_number" ADD CONSTRAINT "phone_number_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."phone_number" ADD CONSTRAINT "phone_number_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."phone_number" ADD CONSTRAINT "phone_number_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."phone_number" ADD CONSTRAINT "phone_number_sipTrunkId_fkey" FOREIGN KEY ("sipTrunkId") REFERENCES "public"."sip_trunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sip_trunk" ADD CONSTRAINT "sip_trunk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_rule" ADD CONSTRAINT "dispatch_rule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_rule" ADD CONSTRAINT "dispatch_rule_sipTrunkId_fkey" FOREIGN KEY ("sipTrunkId") REFERENCES "public"."sip_trunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_rule" ADD CONSTRAINT "dispatch_rule_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_rule" ADD CONSTRAINT "dispatch_rule_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."custom_voice" ADD CONSTRAINT "custom_voice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."egress_job" ADD CONSTRAINT "egress_job_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."egress_job" ADD CONSTRAINT "egress_job_campaignSessionId_fkey" FOREIGN KEY ("campaignSessionId") REFERENCES "public"."campaign_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."avatar_profile" ADD CONSTRAINT "avatar_profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_metric" ADD CONSTRAINT "usage_metric_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_metric" ADD CONSTRAINT "usage_metric_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_metric" ADD CONSTRAINT "usage_metric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_metric" ADD CONSTRAINT "usage_metric_campaignSessionId_fkey" FOREIGN KEY ("campaignSessionId") REFERENCES "public"."campaign_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
