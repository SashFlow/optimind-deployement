-- CreateEnum
CREATE TYPE "public"."PurchaseType" AS ENUM ('SUBSCRIPTION', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "public"."AuditActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'INVITE', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "public"."AuditActorType" AS ENUM ('USER', 'SYSTEM', 'API');

-- CreateEnum
CREATE TYPE "public"."AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."AgentVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."AgentSessionStatus" AS ENUM ('QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AgentSessionChannel" AS ENUM ('WEB', 'SIP', 'PHONE');

-- CreateEnum
CREATE TYPE "public"."AgentSessionDirection" AS ENUM ('NONE', 'INBOUND', 'OUTBOUND', 'WEB');

-- CreateEnum
CREATE TYPE "public"."SessionEndReason" AS ENUM ('COMPLETED', 'PARTICIPANT_LEFT', 'ROOM_FINISHED', 'ERROR', 'CANCELLED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "public"."TranscriptStatus" AS ENUM ('PENDING', 'PARTIAL', 'FINAL', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."TranscriptRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "public"."ToolCallStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."SessionEventActor" AS ENUM ('AGENT', 'USER', 'SYSTEM', 'WORKER');

-- CreateEnum
CREATE TYPE "public"."UsageModality" AS ENUM ('LLM', 'REALTIME', 'STT', 'TTS', 'VAD', 'AVATAR', 'SIP', 'LIVEKIT_ROOM', 'EGRESS');

-- CreateEnum
CREATE TYPE "public"."UnitSource" AS ENUM ('LIVEKIT_INFERENCE', 'BYOK', 'PLATFORM');

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
CREATE TYPE "public"."WorkflowRunStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."WorkflowStepStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."WorkflowWaitKind" AS ENUM ('AGENT_SESSION', 'HUMAN_APPROVAL', 'SCHEDULE', 'HTTP_CALLBACK');

-- CreateEnum
CREATE TYPE "public"."WorkflowWaitStatus" AS ENUM ('PENDING', 'RESUMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."WorkflowApprovalChannel" AS ENUM ('WEB', 'EMAIL');

-- CreateEnum
CREATE TYPE "public"."WorkflowApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."WorkflowTriggerType" AS ENUM ('WEBHOOK', 'SCHEDULE', 'MANUAL', 'TEST');

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

-- CreateEnum
CREATE TYPE "public"."CallbackScheduleStatus" AS ENUM ('PENDING', 'QUEUED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."CallbackScheduleSource" AS ENUM ('RESCHEDULE', 'VOICEMAIL', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."ProviderRateUnit" AS ENUM ('TOKEN', 'MINUTE', 'CHARACTER', 'REQUEST');

-- CreateTable
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "role" TEXT,
    "banned" BOOLEAN,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "paymentsCustomerId" TEXT,
    "locale" TEXT,
    "twoFactorEnabled" BOOLEAN,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,
    "activeOrganizationId" TEXT,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."twoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "paymentsCustomerId" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "platformRole" TEXT DEFAULT 'user',
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "type" "public"."PurchaseType" NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "productId" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorType" "public"."AuditActorType" NOT NULL DEFAULT 'USER',
    "actionType" "public"."AuditActionType" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "before" JSONB NOT NULL DEFAULT '{}',
    "after" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
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
    "label" TEXT NOT NULL DEFAULT '',
    "token" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "usageLimit" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "agent_trial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent_session" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentVersionId" TEXT NOT NULL,
    "livekitRoomName" TEXT NOT NULL,
    "livekitRoomSid" TEXT,
    "livekitJobId" TEXT,
    "livekitWorkerId" TEXT,
    "channel" "public"."AgentSessionChannel" NOT NULL DEFAULT 'WEB',
    "direction" "public"."AgentSessionDirection" NOT NULL DEFAULT 'NONE',
    "sipTrunkId" TEXT,
    "sipDispatchRuleId" TEXT,
    "sipCallId" TEXT,
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "sipAttrs" JSONB NOT NULL DEFAULT '{}',
    "status" "public"."AgentSessionStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "endReason" "public"."SessionEndReason",
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "configSnapshot" JSONB NOT NULL DEFAULT '{}',
    "livekitSessionReport" JSONB,
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "transcriptStatus" "public"."TranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "externalUserId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "agent_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session_event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "actor" "public"."SessionEventActor" NOT NULL DEFAULT 'AGENT',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "session_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transcript" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "language" TEXT,
    "status" "public"."TranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "fullText" TEXT NOT NULL DEFAULT '',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "storageUri" TEXT,
    "retentionExpiresAt" TIMESTAMP(3),

    CONSTRAINT "transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transcript_segment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transcriptId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "role" "public"."TranscriptRole" NOT NULL,
    "speakerIdentity" TEXT,
    "text" TEXT NOT NULL DEFAULT '',
    "startMs" INTEGER,
    "endMs" INTEGER,
    "confidence" DOUBLE PRECISION,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "interrupted" BOOLEAN NOT NULL DEFAULT false,
    "livekitMessageId" TEXT,
    "metrics" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "transcript_segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tool_call_record" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "transcriptSegmentId" TEXT,
    "toolName" TEXT NOT NULL,
    "arguments" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB NOT NULL DEFAULT '{}',
    "status" "public"."ToolCallStatus" NOT NULL DEFAULT 'COMPLETED',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tool_call_record_pkey" PRIMARY KEY ("id")
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
    "agentSessionId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "campaign_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaign_workflow" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "envVars" JSONB NOT NULL DEFAULT '[]',
    "draftNodes" JSONB NOT NULL DEFAULT '[]',
    "draftEdges" JSONB NOT NULL DEFAULT '[]',
    "draftViewport" JSONB NOT NULL DEFAULT '{}',
    "webhookToken" TEXT NOT NULL,
    "publishedVersionId" TEXT,

    CONSTRAINT "campaign_workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaign_workflow_version" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "viewport" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT,

    CONSTRAINT "campaign_workflow_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_run" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,
    "status" "public"."WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "triggerType" "public"."WorkflowTriggerType" NOT NULL,
    "triggerPayload" JSONB NOT NULL DEFAULT '{}',
    "envSnapshot" JSONB NOT NULL DEFAULT '{}',
    "context" JSONB NOT NULL DEFAULT '{}',
    "cursor" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "claimToken" TEXT,

    CONSTRAINT "workflow_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_step" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "runId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "status" "public"."WorkflowStepStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_wait" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "runId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "kind" "public"."WorkflowWaitKind" NOT NULL,
    "status" "public"."WorkflowWaitStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "resumeAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "resumePayload" JSONB,

    CONSTRAINT "workflow_wait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_approval" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "waitId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "channel" "public"."WorkflowApprovalChannel" NOT NULL,
    "decision" "public"."WorkflowApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "emailTo" TEXT,

    CONSTRAINT "workflow_approval_pkey" PRIMARY KEY ("id")
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
    "agentSessionId" TEXT,
    "agentId" TEXT,
    "livekitEgressId" TEXT,
    "type" "public"."EgressJobType" NOT NULL,
    "status" "public"."EgressJobStatus" NOT NULL DEFAULT 'STARTING',
    "roomName" TEXT,
    "outputUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "destination" JSONB NOT NULL DEFAULT '{}',
    "fileUrl" TEXT,
    "durationMs" INTEGER,
    "sizeBytes" INTEGER,
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

-- CreateTable
CREATE TABLE "public"."session_usage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "modality" "public"."UsageModality" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "unitSource" "public"."UnitSource" NOT NULL DEFAULT 'LIVEKIT_INFERENCE',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "inputCachedTokens" INTEGER NOT NULL DEFAULT 0,
    "inputCachedAudioTokens" INTEGER NOT NULL DEFAULT 0,
    "inputCachedTextTokens" INTEGER NOT NULL DEFAULT 0,
    "inputCachedImageTokens" INTEGER NOT NULL DEFAULT 0,
    "inputAudioTokens" INTEGER NOT NULL DEFAULT 0,
    "inputTextTokens" INTEGER NOT NULL DEFAULT 0,
    "inputImageTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputAudioTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTextTokens" INTEGER NOT NULL DEFAULT 0,
    "providerSessionDurationMs" INTEGER NOT NULL DEFAULT 0,
    "charactersCount" INTEGER NOT NULL DEFAULT 0,
    "audioDurationMs" INTEGER NOT NULL DEFAULT 0,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "videoDurationMs" INTEGER NOT NULL DEFAULT 0,
    "callDurationMs" INTEGER NOT NULL DEFAULT 0,
    "billableMinutes" INTEGER NOT NULL DEFAULT 0,
    "participantMinutes" INTEGER NOT NULL DEFAULT 0,
    "egressMinutes" INTEGER NOT NULL DEFAULT 0,
    "egressBytes" INTEGER NOT NULL DEFAULT 0,
    "raw" JSONB NOT NULL DEFAULT '{}',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "session_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session_collected_field" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "fieldType" TEXT NOT NULL DEFAULT 'string',
    "value" JSONB NOT NULL DEFAULT 'null',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_collected_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."callback_schedule" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT,
    "campaignId" TEXT,
    "campaignContactId" TEXT,
    "phoneE164" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."CallbackScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "source" "public"."CallbackScheduleSource" NOT NULL DEFAULT 'RESCHEDULE',
    "contactMetadata" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "completedSessionId" TEXT,

    CONSTRAINT "callback_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."provider_rate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,
    "modality" "public"."UsageModality" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "unit" "public"."ProviderRateUnit" NOT NULL,
    "unitAmountMicros" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "unitSource" "public"."UnitSource",
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "provider_rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "public"."user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "public"."session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "public"."organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "public"."member"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_subscriptionId_key" ON "public"."purchase"("subscriptionId");

-- CreateIndex
CREATE INDEX "purchase_subscriptionId_idx" ON "public"."purchase"("subscriptionId");

-- CreateIndex
CREATE INDEX "audit_log_organizationId_createdAt_idx" ON "public"."audit_log"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_resourceType_resourceId_idx" ON "public"."audit_log"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_log_actionType_createdAt_idx" ON "public"."audit_log"("actionType", "createdAt");

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
CREATE INDEX "agent_session_organizationId_startedAt_idx" ON "public"."agent_session"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "agent_session_agentId_startedAt_idx" ON "public"."agent_session"("agentId", "startedAt");

-- CreateIndex
CREATE INDEX "agent_session_livekitRoomName_idx" ON "public"."agent_session"("livekitRoomName");

-- CreateIndex
CREATE INDEX "agent_session_livekitRoomSid_idx" ON "public"."agent_session"("livekitRoomSid");

-- CreateIndex
CREATE INDEX "agent_session_livekitJobId_idx" ON "public"."agent_session"("livekitJobId");

-- CreateIndex
CREATE INDEX "agent_session_status_idx" ON "public"."agent_session"("status");

-- CreateIndex
CREATE INDEX "agent_session_sipTrunkId_idx" ON "public"."agent_session"("sipTrunkId");

-- CreateIndex
CREATE INDEX "agent_session_sipDispatchRuleId_idx" ON "public"."agent_session"("sipDispatchRuleId");

-- CreateIndex
CREATE INDEX "session_event_organizationId_occurredAt_idx" ON "public"."session_event"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "session_event_sessionId_occurredAt_idx" ON "public"."session_event"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "session_event_organizationId_eventType_occurredAt_idx" ON "public"."session_event"("organizationId", "eventType", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "session_event_sessionId_sequence_key" ON "public"."session_event"("sessionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_sessionId_key" ON "public"."transcript"("sessionId");

-- CreateIndex
CREATE INDEX "transcript_organizationId_idx" ON "public"."transcript"("organizationId");

-- CreateIndex
CREATE INDEX "transcript_agentId_idx" ON "public"."transcript"("agentId");

-- CreateIndex
CREATE INDEX "transcript_segment_sessionId_sequence_idx" ON "public"."transcript_segment"("sessionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_segment_transcriptId_sequence_key" ON "public"."transcript_segment"("transcriptId", "sequence");

-- CreateIndex
CREATE INDEX "tool_call_record_sessionId_idx" ON "public"."tool_call_record"("sessionId");

-- CreateIndex
CREATE INDEX "tool_call_record_organizationId_idx" ON "public"."tool_call_record"("organizationId");

-- CreateIndex
CREATE INDEX "tool_call_record_transcriptSegmentId_idx" ON "public"."tool_call_record"("transcriptSegmentId");

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
CREATE UNIQUE INDEX "campaign_session_agentSessionId_key" ON "public"."campaign_session"("agentSessionId");

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
CREATE UNIQUE INDEX "campaign_workflow_campaignId_key" ON "public"."campaign_workflow"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_workflow_webhookToken_key" ON "public"."campaign_workflow"("webhookToken");

-- CreateIndex
CREATE INDEX "campaign_workflow_organizationId_idx" ON "public"."campaign_workflow"("organizationId");

-- CreateIndex
CREATE INDEX "campaign_workflow_version_workflowId_idx" ON "public"."campaign_workflow_version"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_workflow_version_workflowId_version_key" ON "public"."campaign_workflow_version"("workflowId", "version");

-- CreateIndex
CREATE INDEX "workflow_run_campaignId_status_createdAt_idx" ON "public"."workflow_run"("campaignId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "workflow_run_workflowId_status_idx" ON "public"."workflow_run"("workflowId", "status");

-- CreateIndex
CREATE INDEX "workflow_run_organizationId_createdAt_idx" ON "public"."workflow_run"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "workflow_run_status_claimedAt_idx" ON "public"."workflow_run"("status", "claimedAt");

-- CreateIndex
CREATE INDEX "workflow_step_runId_status_idx" ON "public"."workflow_step"("runId", "status");

-- CreateIndex
CREATE INDEX "workflow_step_nodeId_idx" ON "public"."workflow_step"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_step_runId_nodeId_attempt_key" ON "public"."workflow_step"("runId", "nodeId", "attempt");

-- CreateIndex
CREATE INDEX "workflow_wait_status_resumeAt_idx" ON "public"."workflow_wait"("status", "resumeAt");

-- CreateIndex
CREATE INDEX "workflow_wait_kind_externalId_idx" ON "public"."workflow_wait"("kind", "externalId");

-- CreateIndex
CREATE INDEX "workflow_wait_runId_idx" ON "public"."workflow_wait"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_approval_token_key" ON "public"."workflow_approval"("token");

-- CreateIndex
CREATE INDEX "workflow_approval_organizationId_idx" ON "public"."workflow_approval"("organizationId");

-- CreateIndex
CREATE INDEX "workflow_approval_runId_idx" ON "public"."workflow_approval"("runId");

-- CreateIndex
CREATE INDEX "workflow_approval_token_idx" ON "public"."workflow_approval"("token");

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
CREATE INDEX "egress_job_agentSessionId_idx" ON "public"."egress_job"("agentSessionId");

-- CreateIndex
CREATE INDEX "egress_job_agentId_idx" ON "public"."egress_job"("agentId");

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

-- CreateIndex
CREATE INDEX "session_usage_organizationId_capturedAt_idx" ON "public"."session_usage"("organizationId", "capturedAt");

-- CreateIndex
CREATE INDEX "session_usage_organizationId_modality_capturedAt_idx" ON "public"."session_usage"("organizationId", "modality", "capturedAt");

-- CreateIndex
CREATE INDEX "session_usage_agentId_idx" ON "public"."session_usage"("agentId");

-- CreateIndex
CREATE INDEX "session_usage_sessionId_idx" ON "public"."session_usage"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "session_usage_sessionId_modality_provider_model_key" ON "public"."session_usage"("sessionId", "modality", "provider", "model");

-- CreateIndex
CREATE INDEX "session_collected_field_organizationId_capturedAt_idx" ON "public"."session_collected_field"("organizationId", "capturedAt");

-- CreateIndex
CREATE INDEX "session_collected_field_agentId_key_idx" ON "public"."session_collected_field"("agentId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "session_collected_field_sessionId_key_key" ON "public"."session_collected_field"("sessionId", "key");

-- CreateIndex
CREATE INDEX "callback_schedule_organizationId_scheduledAt_idx" ON "public"."callback_schedule"("organizationId", "scheduledAt");

-- CreateIndex
CREATE INDEX "callback_schedule_status_scheduledAt_idx" ON "public"."callback_schedule"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "callback_schedule_campaignContactId_idx" ON "public"."callback_schedule"("campaignContactId");

-- CreateIndex
CREATE INDEX "callback_schedule_sessionId_idx" ON "public"."callback_schedule"("sessionId");

-- CreateIndex
CREATE INDEX "provider_rate_modality_provider_effectiveFrom_idx" ON "public"."provider_rate"("modality", "provider", "effectiveFrom");

-- CreateIndex
CREATE INDEX "provider_rate_organizationId_modality_provider_idx" ON "public"."provider_rate"("organizationId", "modality", "provider");

-- AddForeignKey
ALTER TABLE "public"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."passkey" ADD CONSTRAINT "passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase" ADD CONSTRAINT "purchase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase" ADD CONSTRAINT "purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "public"."agent_session" ADD CONSTRAINT "agent_session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_session" ADD CONSTRAINT "agent_session_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_session" ADD CONSTRAINT "agent_session_agentVersionId_fkey" FOREIGN KEY ("agentVersionId") REFERENCES "public"."agent_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_session" ADD CONSTRAINT "agent_session_sipTrunkId_fkey" FOREIGN KEY ("sipTrunkId") REFERENCES "public"."sip_trunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_session" ADD CONSTRAINT "agent_session_sipDispatchRuleId_fkey" FOREIGN KEY ("sipDispatchRuleId") REFERENCES "public"."dispatch_rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_event" ADD CONSTRAINT "session_event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_event" ADD CONSTRAINT "session_event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transcript" ADD CONSTRAINT "transcript_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transcript" ADD CONSTRAINT "transcript_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transcript" ADD CONSTRAINT "transcript_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transcript_segment" ADD CONSTRAINT "transcript_segment_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "public"."transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tool_call_record" ADD CONSTRAINT "tool_call_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tool_call_record" ADD CONSTRAINT "tool_call_record_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tool_call_record" ADD CONSTRAINT "tool_call_record_transcriptSegmentId_fkey" FOREIGN KEY ("transcriptSegmentId") REFERENCES "public"."transcript_segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "public"."campaign_session" ADD CONSTRAINT "campaign_session_agentSessionId_fkey" FOREIGN KEY ("agentSessionId") REFERENCES "public"."agent_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_workflow" ADD CONSTRAINT "campaign_workflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_workflow" ADD CONSTRAINT "campaign_workflow_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_workflow" ADD CONSTRAINT "campaign_workflow_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "public"."campaign_workflow_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_workflow_version" ADD CONSTRAINT "campaign_workflow_version_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."campaign_workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_run" ADD CONSTRAINT "workflow_run_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_run" ADD CONSTRAINT "workflow_run_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_run" ADD CONSTRAINT "workflow_run_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."campaign_workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_run" ADD CONSTRAINT "workflow_run_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "public"."campaign_workflow_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_step" ADD CONSTRAINT "workflow_step_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_wait" ADD CONSTRAINT "workflow_wait_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_wait" ADD CONSTRAINT "workflow_wait_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "public"."workflow_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_approval" ADD CONSTRAINT "workflow_approval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_approval" ADD CONSTRAINT "workflow_approval_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_approval" ADD CONSTRAINT "workflow_approval_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "public"."workflow_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_approval" ADD CONSTRAINT "workflow_approval_waitId_fkey" FOREIGN KEY ("waitId") REFERENCES "public"."workflow_wait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "public"."egress_job" ADD CONSTRAINT "egress_job_agentSessionId_fkey" FOREIGN KEY ("agentSessionId") REFERENCES "public"."agent_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."egress_job" ADD CONSTRAINT "egress_job_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "public"."session_usage" ADD CONSTRAINT "session_usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_usage" ADD CONSTRAINT "session_usage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_usage" ADD CONSTRAINT "session_usage_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_collected_field" ADD CONSTRAINT "session_collected_field_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_collected_field" ADD CONSTRAINT "session_collected_field_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_collected_field" ADD CONSTRAINT "session_collected_field_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."callback_schedule" ADD CONSTRAINT "callback_schedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."callback_schedule" ADD CONSTRAINT "callback_schedule_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."callback_schedule" ADD CONSTRAINT "callback_schedule_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."callback_schedule" ADD CONSTRAINT "callback_schedule_campaignContactId_fkey" FOREIGN KEY ("campaignContactId") REFERENCES "public"."campaign_contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."callback_schedule" ADD CONSTRAINT "callback_schedule_completedSessionId_fkey" FOREIGN KEY ("completedSessionId") REFERENCES "public"."agent_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."provider_rate" ADD CONSTRAINT "provider_rate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
