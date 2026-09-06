-- CreateEnum
CREATE TYPE "AgentSessionStatus" AS ENUM ('QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentSessionChannel" AS ENUM ('WEB', 'SIP', 'PHONE');

-- CreateEnum
CREATE TYPE "AgentSessionDirection" AS ENUM ('NONE', 'INBOUND', 'OUTBOUND', 'WEB');

-- CreateEnum
CREATE TYPE "SessionEndReason" AS ENUM ('COMPLETED', 'PARTICIPANT_LEFT', 'ROOM_FINISHED', 'ERROR', 'CANCELLED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "TranscriptStatus" AS ENUM ('PENDING', 'PARTIAL', 'FINAL', 'FAILED');

-- CreateEnum
CREATE TYPE "TranscriptRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SessionEventActor" AS ENUM ('AGENT', 'USER', 'SYSTEM', 'WORKER');

-- CreateEnum
CREATE TYPE "UsageModality" AS ENUM ('LLM', 'REALTIME', 'STT', 'TTS', 'VAD', 'AVATAR', 'SIP', 'LIVEKIT_ROOM', 'EGRESS');

-- CreateEnum
CREATE TYPE "UnitSource" AS ENUM ('LIVEKIT_INFERENCE', 'BYOK', 'PLATFORM');

-- CreateTable
CREATE TABLE "agent_session" (
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
    "channel" "AgentSessionChannel" NOT NULL DEFAULT 'WEB',
    "direction" "AgentSessionDirection" NOT NULL DEFAULT 'NONE',
    "sipTrunkId" TEXT,
    "sipDispatchRuleId" TEXT,
    "sipCallId" TEXT,
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "sipAttrs" JSONB NOT NULL DEFAULT '{}',
    "status" "AgentSessionStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "endReason" "SessionEndReason",
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "configSnapshot" JSONB NOT NULL DEFAULT '{}',
    "livekitSessionReport" JSONB,
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "transcriptStatus" "TranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "externalUserId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "agent_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "actor" "SessionEventActor" NOT NULL DEFAULT 'AGENT',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "session_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "language" TEXT,
    "status" "TranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "fullText" TEXT NOT NULL DEFAULT '',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "storageUri" TEXT,
    "retentionExpiresAt" TIMESTAMP(3),

    CONSTRAINT "transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_segment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transcriptId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "role" "TranscriptRole" NOT NULL,
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
CREATE TABLE "tool_call_record" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "transcriptSegmentId" TEXT,
    "toolName" TEXT NOT NULL,
    "arguments" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB NOT NULL DEFAULT '{}',
    "status" "ToolCallStatus" NOT NULL DEFAULT 'COMPLETED',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tool_call_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_usage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "modality" "UsageModality" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "unitSource" "UnitSource" NOT NULL DEFAULT 'LIVEKIT_INFERENCE',
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

-- AlterTable
ALTER TABLE "campaign_session" ADD COLUMN "agentSessionId" TEXT;

-- AlterTable
ALTER TABLE "egress_job" ADD COLUMN "agentSessionId" TEXT,
ADD COLUMN "agentId" TEXT,
ADD COLUMN "destination" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "fileUrl" TEXT,
ADD COLUMN "durationMs" INTEGER,
ADD COLUMN "sizeBytes" INTEGER;

-- CreateIndex
CREATE INDEX "agent_session_organizationId_startedAt_idx" ON "agent_session"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "agent_session_agentId_startedAt_idx" ON "agent_session"("agentId", "startedAt");

-- CreateIndex
CREATE INDEX "agent_session_livekitRoomName_idx" ON "agent_session"("livekitRoomName");

-- CreateIndex
CREATE INDEX "agent_session_livekitRoomSid_idx" ON "agent_session"("livekitRoomSid");

-- CreateIndex
CREATE INDEX "agent_session_livekitJobId_idx" ON "agent_session"("livekitJobId");

-- CreateIndex
CREATE INDEX "agent_session_status_idx" ON "agent_session"("status");

-- CreateIndex
CREATE INDEX "agent_session_sipTrunkId_idx" ON "agent_session"("sipTrunkId");

-- CreateIndex
CREATE INDEX "agent_session_sipDispatchRuleId_idx" ON "agent_session"("sipDispatchRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "session_event_sessionId_sequence_key" ON "session_event"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "session_event_organizationId_occurredAt_idx" ON "session_event"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "session_event_sessionId_occurredAt_idx" ON "session_event"("sessionId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_sessionId_key" ON "transcript"("sessionId");

-- CreateIndex
CREATE INDEX "transcript_organizationId_idx" ON "transcript"("organizationId");

-- CreateIndex
CREATE INDEX "transcript_agentId_idx" ON "transcript"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_segment_transcriptId_sequence_key" ON "transcript_segment"("transcriptId", "sequence");

-- CreateIndex
CREATE INDEX "transcript_segment_sessionId_sequence_idx" ON "transcript_segment"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "tool_call_record_sessionId_idx" ON "tool_call_record"("sessionId");

-- CreateIndex
CREATE INDEX "tool_call_record_organizationId_idx" ON "tool_call_record"("organizationId");

-- CreateIndex
CREATE INDEX "tool_call_record_transcriptSegmentId_idx" ON "tool_call_record"("transcriptSegmentId");

-- CreateIndex
CREATE UNIQUE INDEX "session_usage_sessionId_modality_provider_model_key" ON "session_usage"("sessionId", "modality", "provider", "model");

-- CreateIndex
CREATE INDEX "session_usage_organizationId_capturedAt_idx" ON "session_usage"("organizationId", "capturedAt");

-- CreateIndex
CREATE INDEX "session_usage_agentId_idx" ON "session_usage"("agentId");

-- CreateIndex
CREATE INDEX "session_usage_sessionId_idx" ON "session_usage"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_session_agentSessionId_key" ON "campaign_session"("agentSessionId");

-- CreateIndex
CREATE INDEX "egress_job_agentSessionId_idx" ON "egress_job"("agentSessionId");

-- CreateIndex
CREATE INDEX "egress_job_agentId_idx" ON "egress_job"("agentId");

-- AddForeignKey
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_agentVersionId_fkey" FOREIGN KEY ("agentVersionId") REFERENCES "agent_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_sipTrunkId_fkey" FOREIGN KEY ("sipTrunkId") REFERENCES "sip_trunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_sipDispatchRuleId_fkey" FOREIGN KEY ("sipDispatchRuleId") REFERENCES "dispatch_rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_event" ADD CONSTRAINT "session_event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_event" ADD CONSTRAINT "session_event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript" ADD CONSTRAINT "transcript_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript" ADD CONSTRAINT "transcript_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript" ADD CONSTRAINT "transcript_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segment" ADD CONSTRAINT "transcript_segment_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_call_record" ADD CONSTRAINT "tool_call_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_call_record" ADD CONSTRAINT "tool_call_record_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_call_record" ADD CONSTRAINT "tool_call_record_transcriptSegmentId_fkey" FOREIGN KEY ("transcriptSegmentId") REFERENCES "transcript_segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_usage" ADD CONSTRAINT "session_usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_usage" ADD CONSTRAINT "session_usage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_usage" ADD CONSTRAINT "session_usage_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_session" ADD CONSTRAINT "campaign_session_agentSessionId_fkey" FOREIGN KEY ("agentSessionId") REFERENCES "agent_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egress_job" ADD CONSTRAINT "egress_job_agentSessionId_fkey" FOREIGN KEY ("agentSessionId") REFERENCES "agent_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egress_job" ADD CONSTRAINT "egress_job_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
