-- Analytics platform: collected fields, callbacks, provider rates, indexes

CREATE TYPE "CallbackScheduleStatus" AS ENUM ('PENDING', 'QUEUED', 'COMPLETED', 'CANCELLED', 'FAILED');
CREATE TYPE "CallbackScheduleSource" AS ENUM ('RESCHEDULE', 'VOICEMAIL', 'MANUAL');
CREATE TYPE "ProviderRateUnit" AS ENUM ('TOKEN', 'MINUTE', 'CHARACTER', 'REQUEST');

CREATE TABLE "session_collected_field" (
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

CREATE TABLE "callback_schedule" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT,
    "campaignId" TEXT,
    "campaignContactId" TEXT,
    "phoneE164" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "CallbackScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "source" "CallbackScheduleSource" NOT NULL DEFAULT 'RESCHEDULE',
    "contactMetadata" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "completedSessionId" TEXT,

    CONSTRAINT "callback_schedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provider_rate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,
    "modality" "UsageModality" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "unit" "ProviderRateUnit" NOT NULL,
    "unitAmountMicros" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "unitSource" "UnitSource",
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "provider_rate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "session_collected_field_sessionId_key_key" ON "session_collected_field"("sessionId", "key");
CREATE INDEX "session_collected_field_organizationId_capturedAt_idx" ON "session_collected_field"("organizationId", "capturedAt");
CREATE INDEX "session_collected_field_agentId_key_idx" ON "session_collected_field"("agentId", "key");

CREATE INDEX "callback_schedule_organizationId_scheduledAt_idx" ON "callback_schedule"("organizationId", "scheduledAt");
CREATE INDEX "callback_schedule_status_scheduledAt_idx" ON "callback_schedule"("status", "scheduledAt");
CREATE INDEX "callback_schedule_campaignContactId_idx" ON "callback_schedule"("campaignContactId");
CREATE INDEX "callback_schedule_sessionId_idx" ON "callback_schedule"("sessionId");

CREATE INDEX "provider_rate_modality_provider_effectiveFrom_idx" ON "provider_rate"("modality", "provider", "effectiveFrom");
CREATE INDEX "provider_rate_organizationId_modality_provider_idx" ON "provider_rate"("organizationId", "modality", "provider");

CREATE INDEX "session_usage_organizationId_modality_capturedAt_idx" ON "session_usage"("organizationId", "modality", "capturedAt");
CREATE INDEX "session_event_organizationId_eventType_occurredAt_idx" ON "session_event"("organizationId", "eventType", "occurredAt");

ALTER TABLE "session_collected_field" ADD CONSTRAINT "session_collected_field_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_collected_field" ADD CONSTRAINT "session_collected_field_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_collected_field" ADD CONSTRAINT "session_collected_field_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "callback_schedule" ADD CONSTRAINT "callback_schedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "callback_schedule" ADD CONSTRAINT "callback_schedule_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "callback_schedule" ADD CONSTRAINT "callback_schedule_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "callback_schedule" ADD CONSTRAINT "callback_schedule_campaignContactId_fkey" FOREIGN KEY ("campaignContactId") REFERENCES "campaign_contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "callback_schedule" ADD CONSTRAINT "callback_schedule_completedSessionId_fkey" FOREIGN KEY ("completedSessionId") REFERENCES "agent_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "provider_rate" ADD CONSTRAINT "provider_rate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Platform default rates (unitAmountMicros = micros of USD per unit)
INSERT INTO "provider_rate" ("id", "createdAt", "updatedAt", "organizationId", "modality", "provider", "model", "unit", "unitAmountMicros", "currency", "unitSource", "effectiveFrom") VALUES
('prate_llm_openai_gpt4o_in', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'LLM', 'openai', 'gpt-4o', 'TOKEN', 5, 'USD', 'LIVEKIT_INFERENCE', CURRENT_TIMESTAMP),
('prate_llm_openai_default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'LLM', 'openai', NULL, 'TOKEN', 5, 'USD', 'LIVEKIT_INFERENCE', CURRENT_TIMESTAMP),
('prate_stt_deepgram', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'STT', 'deepgram', NULL, 'MINUTE', 4300, 'USD', 'LIVEKIT_INFERENCE', CURRENT_TIMESTAMP),
('prate_tts_eleven', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'TTS', 'elevenlabs', NULL, 'CHARACTER', 30, 'USD', 'LIVEKIT_INFERENCE', CURRENT_TIMESTAMP),
('prate_realtime_openai', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'REALTIME', 'openai', 'gpt-4o-realtime', 'MINUTE', 32000, 'USD', 'LIVEKIT_INFERENCE', CURRENT_TIMESTAMP),
('prate_sip_default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'SIP', 'livekit', NULL, 'MINUTE', 10000, 'USD', 'PLATFORM', CURRENT_TIMESTAMP),
('prate_egress_default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'EGRESS', 'livekit', NULL, 'MINUTE', 5000, 'USD', 'PLATFORM', CURRENT_TIMESTAMP);
