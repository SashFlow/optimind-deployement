/**
 * Prisma Zod Generator - Single File (inlined)
 * Auto-generated. Do not edit.
 */

import { createId as generateCuid } from "@paralleldrive/cuid2";
import * as z from 'zod';
// File: TransactionIsolationLevel.schema.ts

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted', 'ReadCommitted', 'RepeatableRead', 'Serializable'])

export type TransactionIsolationLevel = z.infer<typeof TransactionIsolationLevelSchema>;

// File: UserScalarFieldEnum.schema.ts

export const UserScalarFieldEnumSchema = z.enum(['id', 'name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt', 'username', 'role', 'banned', 'banReason', 'banExpires', 'onboardingComplete', 'paymentsCustomerId', 'locale', 'twoFactorEnabled'])

export type UserScalarFieldEnum = z.infer<typeof UserScalarFieldEnumSchema>;

// File: SessionScalarFieldEnum.schema.ts

export const SessionScalarFieldEnumSchema = z.enum(['id', 'expiresAt', 'ipAddress', 'userAgent', 'userId', 'impersonatedBy', 'activeOrganizationId', 'token', 'createdAt', 'updatedAt'])

export type SessionScalarFieldEnum = z.infer<typeof SessionScalarFieldEnumSchema>;

// File: AccountScalarFieldEnum.schema.ts

export const AccountScalarFieldEnumSchema = z.enum(['id', 'accountId', 'providerId', 'userId', 'accessToken', 'refreshToken', 'idToken', 'expiresAt', 'password', 'accessTokenExpiresAt', 'refreshTokenExpiresAt', 'scope', 'createdAt', 'updatedAt'])

export type AccountScalarFieldEnum = z.infer<typeof AccountScalarFieldEnumSchema>;

// File: VerificationScalarFieldEnum.schema.ts

export const VerificationScalarFieldEnumSchema = z.enum(['id', 'identifier', 'value', 'expiresAt', 'createdAt', 'updatedAt'])

export type VerificationScalarFieldEnum = z.infer<typeof VerificationScalarFieldEnumSchema>;

// File: PasskeyScalarFieldEnum.schema.ts

export const PasskeyScalarFieldEnumSchema = z.enum(['id', 'name', 'publicKey', 'userId', 'credentialID', 'counter', 'deviceType', 'backedUp', 'transports', 'createdAt'])

export type PasskeyScalarFieldEnum = z.infer<typeof PasskeyScalarFieldEnumSchema>;

// File: TwoFactorScalarFieldEnum.schema.ts

export const TwoFactorScalarFieldEnumSchema = z.enum(['id', 'secret', 'backupCodes', 'userId'])

export type TwoFactorScalarFieldEnum = z.infer<typeof TwoFactorScalarFieldEnumSchema>;

// File: OrganizationScalarFieldEnum.schema.ts

export const OrganizationScalarFieldEnumSchema = z.enum(['id', 'name', 'slug', 'logo', 'createdAt', 'metadata', 'paymentsCustomerId'])

export type OrganizationScalarFieldEnum = z.infer<typeof OrganizationScalarFieldEnumSchema>;

// File: MemberScalarFieldEnum.schema.ts

export const MemberScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'userId', 'role', 'createdAt'])

export type MemberScalarFieldEnum = z.infer<typeof MemberScalarFieldEnumSchema>;

// File: InvitationScalarFieldEnum.schema.ts

export const InvitationScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'email', 'role', 'platformRole', 'status', 'expiresAt', 'inviterId'])

export type InvitationScalarFieldEnum = z.infer<typeof InvitationScalarFieldEnumSchema>;

// File: PurchaseScalarFieldEnum.schema.ts

export const PurchaseScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'userId', 'type', 'customerId', 'subscriptionId', 'productId', 'status', 'createdAt', 'updatedAt'])

export type PurchaseScalarFieldEnum = z.infer<typeof PurchaseScalarFieldEnumSchema>;

// File: AuditLogScalarFieldEnum.schema.ts

export const AuditLogScalarFieldEnumSchema = z.enum(['id', 'userId', 'createdAt', 'updatedAt', 'organizationId', 'actorType', 'actionType', 'resourceType', 'resourceId', 'requestId', 'ipAddress', 'userAgent', 'before', 'after'])

export type AuditLogScalarFieldEnum = z.infer<typeof AuditLogScalarFieldEnumSchema>;

// File: AgentScalarFieldEnum.schema.ts

export const AgentScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'name', 'description', 'status', 'draftVersionId', 'publishedVersionId', 'embedEnabled', 'token'])

export type AgentScalarFieldEnum = z.infer<typeof AgentScalarFieldEnumSchema>;

// File: AgentVersionScalarFieldEnum.schema.ts

export const AgentVersionScalarFieldEnumSchema = z.enum(['id', 'agentId', 'createdAt', 'updatedAt', 'organizationId', 'isDraft', 'version', 'config'])

export type AgentVersionScalarFieldEnum = z.infer<typeof AgentVersionScalarFieldEnumSchema>;

// File: AgentTrialScalarFieldEnum.schema.ts

export const AgentTrialScalarFieldEnumSchema = z.enum(['id', 'agentId', 'createdAt', 'updatedAt', 'label', 'token', 'enabled', 'usageLimit', 'usageCount', 'expiresAt'])

export type AgentTrialScalarFieldEnum = z.infer<typeof AgentTrialScalarFieldEnumSchema>;

// File: AgentSessionScalarFieldEnum.schema.ts

export const AgentSessionScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'agentId', 'agentVersionId', 'livekitRoomName', 'livekitRoomSid', 'livekitJobId', 'livekitWorkerId', 'channel', 'direction', 'sipTrunkId', 'sipDispatchRuleId', 'sipCallId', 'fromNumber', 'toNumber', 'sipAttrs', 'status', 'startedAt', 'connectedAt', 'endedAt', 'durationMs', 'endReason', 'errorCode', 'errorMessage', 'configSnapshot', 'livekitSessionReport', 'recordingEnabled', 'transcriptStatus', 'externalUserId', 'metadata'])

export type AgentSessionScalarFieldEnum = z.infer<typeof AgentSessionScalarFieldEnumSchema>;

// File: SessionEventScalarFieldEnum.schema.ts

export const SessionEventScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'organizationId', 'sessionId', 'sequence', 'eventType', 'actor', 'occurredAt', 'payload'])

export type SessionEventScalarFieldEnum = z.infer<typeof SessionEventScalarFieldEnumSchema>;

// File: TranscriptScalarFieldEnum.schema.ts

export const TranscriptScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'sessionId', 'agentId', 'language', 'status', 'fullText', 'wordCount', 'storageUri', 'retentionExpiresAt'])

export type TranscriptScalarFieldEnum = z.infer<typeof TranscriptScalarFieldEnumSchema>;

// File: TranscriptSegmentScalarFieldEnum.schema.ts

export const TranscriptSegmentScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'transcriptId', 'sessionId', 'sequence', 'role', 'speakerIdentity', 'text', 'startMs', 'endMs', 'confidence', 'isFinal', 'interrupted', 'livekitMessageId', 'metrics'])

export type TranscriptSegmentScalarFieldEnum = z.infer<typeof TranscriptSegmentScalarFieldEnumSchema>;

// File: ToolCallRecordScalarFieldEnum.schema.ts

export const ToolCallRecordScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'organizationId', 'sessionId', 'transcriptSegmentId', 'toolName', 'arguments', 'result', 'status', 'error', 'startedAt', 'completedAt'])

export type ToolCallRecordScalarFieldEnum = z.infer<typeof ToolCallRecordScalarFieldEnumSchema>;

// File: CampaignScalarFieldEnum.schema.ts

export const CampaignScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'agentId', 'name', 'description', 'status', 'mode', 'channel', 'priority', 'contextSchema', 'startAt', 'endAt', 'timezone', 'callingWindowStartHour', 'callingWindowEndHour', 'maxConcurrentSessions', 'maxAttemptsPerContact', 'retryDelayMinutes', 'publicToken', 'embedEnabled', 'inboundAddress', 'metadata'])

export type CampaignScalarFieldEnum = z.infer<typeof CampaignScalarFieldEnumSchema>;

// File: CampaignContactScalarFieldEnum.schema.ts

export const CampaignContactScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'campaignId', 'displayName', 'phoneE164', 'email', 'timezone', 'locale', 'externalId', 'context', 'status', 'attemptCount', 'lastAttemptAt', 'nextAttemptAt', 'lastOutcome', 'doNotContact', 'consentGiven', 'consentAt', 'consentSource', 'memorySummary', 'memoryUpdatedAt', 'metadata'])

export type CampaignContactScalarFieldEnum = z.infer<typeof CampaignContactScalarFieldEnumSchema>;

// File: CampaignAccessLinkScalarFieldEnum.schema.ts

export const CampaignAccessLinkScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'campaignId', 'contactId', 'kind', 'token', 'enabled', 'label', 'contextOverrides', 'expiresAt', 'maxUses', 'useCount', 'metadata'])

export type CampaignAccessLinkScalarFieldEnum = z.infer<typeof CampaignAccessLinkScalarFieldEnumSchema>;

// File: CampaignSessionScalarFieldEnum.schema.ts

export const CampaignSessionScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'campaignId', 'contactId', 'accessLinkId', 'channel', 'direction', 'status', 'startedAt', 'endedAt', 'contextSnapshot', 'outcome', 'summary', 'transcript', 'messages', 'recordingUrl', 'durationSeconds', 'livekitRoomName', 'livekitRoomSid', 'parentSessionId', 'egressId', 'egressStatus', 'agentSessionId', 'metadata'])

export type CampaignSessionScalarFieldEnum = z.infer<typeof CampaignSessionScalarFieldEnumSchema>;

// File: CampaignWorkflowScalarFieldEnum.schema.ts

export const CampaignWorkflowScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'campaignId', 'envVars', 'draftNodes', 'draftEdges', 'draftViewport', 'webhookToken', 'publishedVersionId'])

export type CampaignWorkflowScalarFieldEnum = z.infer<typeof CampaignWorkflowScalarFieldEnumSchema>;

// File: CampaignWorkflowVersionScalarFieldEnum.schema.ts

export const CampaignWorkflowVersionScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'workflowId', 'version', 'nodes', 'edges', 'viewport', 'publishedAt', 'label'])

export type CampaignWorkflowVersionScalarFieldEnum = z.infer<typeof CampaignWorkflowVersionScalarFieldEnumSchema>;

// File: WorkflowRunScalarFieldEnum.schema.ts

export const WorkflowRunScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'campaignId', 'workflowId', 'workflowVersionId', 'status', 'triggerType', 'triggerPayload', 'envSnapshot', 'context', 'cursor', 'error', 'startedAt', 'finishedAt', 'claimedAt', 'claimToken'])

export type WorkflowRunScalarFieldEnum = z.infer<typeof WorkflowRunScalarFieldEnumSchema>;

// File: WorkflowStepScalarFieldEnum.schema.ts

export const WorkflowStepScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'runId', 'nodeId', 'nodeType', 'status', 'attempt', 'input', 'output', 'error', 'startedAt', 'finishedAt'])

export type WorkflowStepScalarFieldEnum = z.infer<typeof WorkflowStepScalarFieldEnumSchema>;

// File: WorkflowWaitScalarFieldEnum.schema.ts

export const WorkflowWaitScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'runId', 'stepId', 'kind', 'status', 'externalId', 'resumeAt', 'payload', 'resumePayload'])

export type WorkflowWaitScalarFieldEnum = z.infer<typeof WorkflowWaitScalarFieldEnumSchema>;

// File: WorkflowApprovalScalarFieldEnum.schema.ts

export const WorkflowApprovalScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'runId', 'stepId', 'waitId', 'token', 'channel', 'decision', 'message', 'decidedBy', 'decidedAt', 'expiresAt', 'emailTo'])

export type WorkflowApprovalScalarFieldEnum = z.infer<typeof WorkflowApprovalScalarFieldEnumSchema>;

// File: KnowledgeBaseScalarFieldEnum.schema.ts

export const KnowledgeBaseScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'name', 'description', 'embeddingModel', 'embeddingDim', 'status', 'metadata'])

export type KnowledgeBaseScalarFieldEnum = z.infer<typeof KnowledgeBaseScalarFieldEnumSchema>;

// File: DocumentScalarFieldEnum.schema.ts

export const DocumentScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'knowledgeBaseId', 'title', 'sourceType', 'sourceUrl', 'storageKey', 'status', 'errorMessage', 'metadata'])

export type DocumentScalarFieldEnum = z.infer<typeof DocumentScalarFieldEnumSchema>;

// File: DocumentChunkScalarFieldEnum.schema.ts

export const DocumentChunkScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'documentId', 'content', 'chunkIndex', 'tokenCount', 'metadata', 'embedding'])

export type DocumentChunkScalarFieldEnum = z.infer<typeof DocumentChunkScalarFieldEnumSchema>;

// File: AgentKnowledgeBaseScalarFieldEnum.schema.ts

export const AgentKnowledgeBaseScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'agentId', 'knowledgeBaseId'])

export type AgentKnowledgeBaseScalarFieldEnum = z.infer<typeof AgentKnowledgeBaseScalarFieldEnumSchema>;

// File: CampaignKnowledgeBaseScalarFieldEnum.schema.ts

export const CampaignKnowledgeBaseScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'campaignId', 'knowledgeBaseId'])

export type CampaignKnowledgeBaseScalarFieldEnum = z.infer<typeof CampaignKnowledgeBaseScalarFieldEnumSchema>;

// File: PhoneNumberScalarFieldEnum.schema.ts

export const PhoneNumberScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'campaignId', 'agentId', 'sipTrunkId', 'e164', 'plivoNumberId', 'friendlyName', 'capabilities', 'metadata'])

export type PhoneNumberScalarFieldEnum = z.infer<typeof PhoneNumberScalarFieldEnumSchema>;

// File: SipTrunkScalarFieldEnum.schema.ts

export const SipTrunkScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'name', 'direction', 'livekitTrunkId', 'plivoTrunkId', 'plivoUriId', 'plivoCredentialId', 'authUsername', 'hasCredentials', 'numbers', 'metadata'])

export type SipTrunkScalarFieldEnum = z.infer<typeof SipTrunkScalarFieldEnumSchema>;

// File: DispatchRuleScalarFieldEnum.schema.ts

export const DispatchRuleScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'sipTrunkId', 'agentId', 'campaignId', 'name', 'livekitDispatchRuleId', 'roomPrefix', 'ruleConfig', 'metadata'])

export type DispatchRuleScalarFieldEnum = z.infer<typeof DispatchRuleScalarFieldEnumSchema>;

// File: CustomVoiceScalarFieldEnum.schema.ts

export const CustomVoiceScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'name', 'livekitVoiceId', 'sampleStorageKeys', 'metadata'])

export type CustomVoiceScalarFieldEnum = z.infer<typeof CustomVoiceScalarFieldEnumSchema>;

// File: EgressJobScalarFieldEnum.schema.ts

export const EgressJobScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'campaignSessionId', 'agentSessionId', 'agentId', 'livekitEgressId', 'type', 'status', 'roomName', 'outputUrls', 'destination', 'fileUrl', 'durationMs', 'sizeBytes', 'errorMessage', 'metadata'])

export type EgressJobScalarFieldEnum = z.infer<typeof EgressJobScalarFieldEnumSchema>;

// File: AvatarProfileScalarFieldEnum.schema.ts

export const AvatarProfileScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'name', 'anamAvatarId', 'anamPersonaId', 'previewUrl', 'metadata'])

export type AvatarProfileScalarFieldEnum = z.infer<typeof AvatarProfileScalarFieldEnumSchema>;

// File: UsageMetricScalarFieldEnum.schema.ts

export const UsageMetricScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'organizationId', 'agentId', 'campaignId', 'campaignSessionId', 'source', 'category', 'provider', 'metric', 'value', 'unit', 'recordedAt', 'metadata'])

export type UsageMetricScalarFieldEnum = z.infer<typeof UsageMetricScalarFieldEnumSchema>;

// File: SessionUsageScalarFieldEnum.schema.ts

export const SessionUsageScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'sessionId', 'agentId', 'modality', 'provider', 'model', 'unitSource', 'inputTokens', 'inputCachedTokens', 'inputCachedAudioTokens', 'inputCachedTextTokens', 'inputCachedImageTokens', 'inputAudioTokens', 'inputTextTokens', 'inputImageTokens', 'outputTokens', 'outputAudioTokens', 'outputTextTokens', 'providerSessionDurationMs', 'charactersCount', 'audioDurationMs', 'totalRequests', 'videoDurationMs', 'callDurationMs', 'billableMinutes', 'participantMinutes', 'egressMinutes', 'egressBytes', 'raw', 'capturedAt', 'isFinal'])

export type SessionUsageScalarFieldEnum = z.infer<typeof SessionUsageScalarFieldEnumSchema>;

// File: SessionCollectedFieldScalarFieldEnum.schema.ts

export const SessionCollectedFieldScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'sessionId', 'agentId', 'key', 'label', 'fieldType', 'value', 'required', 'capturedAt'])

export type SessionCollectedFieldScalarFieldEnum = z.infer<typeof SessionCollectedFieldScalarFieldEnumSchema>;

// File: CallbackScheduleScalarFieldEnum.schema.ts

export const CallbackScheduleScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'sessionId', 'campaignId', 'campaignContactId', 'phoneE164', 'scheduledAt', 'status', 'source', 'contactMetadata', 'errorMessage', 'completedSessionId'])

export type CallbackScheduleScalarFieldEnum = z.infer<typeof CallbackScheduleScalarFieldEnumSchema>;

// File: ProviderRateScalarFieldEnum.schema.ts

export const ProviderRateScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'organizationId', 'modality', 'provider', 'model', 'unit', 'unitAmountMicros', 'currency', 'unitSource', 'effectiveFrom', 'effectiveTo'])

export type ProviderRateScalarFieldEnum = z.infer<typeof ProviderRateScalarFieldEnumSchema>;

// File: SortOrder.schema.ts

export const SortOrderSchema = z.enum(['asc', 'desc'])

export type SortOrder = z.infer<typeof SortOrderSchema>;

// File: JsonNullValueInput.schema.ts

export const JsonNullValueInputSchema = z.enum(['JsonNull'])

export type JsonNullValueInput = z.infer<typeof JsonNullValueInputSchema>;

// File: NullableJsonNullValueInput.schema.ts

export const NullableJsonNullValueInputSchema = z.enum(['DbNull', 'JsonNull'])

export type NullableJsonNullValueInput = z.infer<typeof NullableJsonNullValueInputSchema>;

// File: QueryMode.schema.ts

export const QueryModeSchema = z.enum(['default', 'insensitive'])

export type QueryMode = z.infer<typeof QueryModeSchema>;

// File: NullsOrder.schema.ts

export const NullsOrderSchema = z.enum(['first', 'last'])

export type NullsOrder = z.infer<typeof NullsOrderSchema>;

// File: JsonNullValueFilter.schema.ts

export const JsonNullValueFilterSchema = z.enum(['DbNull', 'JsonNull', 'AnyNull'])

export type JsonNullValueFilter = z.infer<typeof JsonNullValueFilterSchema>;

// File: PurchaseType.schema.ts

export const PurchaseTypeSchema = z.enum(['SUBSCRIPTION', 'ONE_TIME'])

export type PurchaseType = z.infer<typeof PurchaseTypeSchema>;

// File: AuditActorType.schema.ts

export const AuditActorTypeSchema = z.enum(['USER', 'SYSTEM', 'API'])

export type AuditActorType = z.infer<typeof AuditActorTypeSchema>;

// File: AuditActionType.schema.ts

export const AuditActionTypeSchema = z.enum(['CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'INVITE', 'LOGIN', 'LOGOUT'])

export type AuditActionType = z.infer<typeof AuditActionTypeSchema>;

// File: AgentStatus.schema.ts

export const AgentStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'DELETED'])

export type AgentStatus = z.infer<typeof AgentStatusSchema>;

// File: AgentVersionStatus.schema.ts

export const AgentVersionStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'DELETED'])

export type AgentVersionStatus = z.infer<typeof AgentVersionStatusSchema>;

// File: AgentSessionChannel.schema.ts

export const AgentSessionChannelSchema = z.enum(['WEB', 'SIP', 'PHONE'])

export type AgentSessionChannel = z.infer<typeof AgentSessionChannelSchema>;

// File: AgentSessionDirection.schema.ts

export const AgentSessionDirectionSchema = z.enum(['NONE', 'INBOUND', 'OUTBOUND', 'WEB'])

export type AgentSessionDirection = z.infer<typeof AgentSessionDirectionSchema>;

// File: AgentSessionStatus.schema.ts

export const AgentSessionStatusSchema = z.enum(['QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED'])

export type AgentSessionStatus = z.infer<typeof AgentSessionStatusSchema>;

// File: SessionEndReason.schema.ts

export const SessionEndReasonSchema = z.enum(['COMPLETED', 'PARTICIPANT_LEFT', 'ROOM_FINISHED', 'ERROR', 'CANCELLED', 'TIMEOUT'])

export type SessionEndReason = z.infer<typeof SessionEndReasonSchema>;

// File: TranscriptStatus.schema.ts

export const TranscriptStatusSchema = z.enum(['PENDING', 'PARTIAL', 'FINAL', 'FAILED'])

export type TranscriptStatus = z.infer<typeof TranscriptStatusSchema>;

// File: SessionEventActor.schema.ts

export const SessionEventActorSchema = z.enum(['AGENT', 'USER', 'SYSTEM', 'WORKER'])

export type SessionEventActor = z.infer<typeof SessionEventActorSchema>;

// File: TranscriptRole.schema.ts

export const TranscriptRoleSchema = z.enum(['USER', 'ASSISTANT', 'SYSTEM', 'TOOL'])

export type TranscriptRole = z.infer<typeof TranscriptRoleSchema>;

// File: ToolCallStatus.schema.ts

export const ToolCallStatusSchema = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'])

export type ToolCallStatus = z.infer<typeof ToolCallStatusSchema>;

// File: CampaignStatus.schema.ts

export const CampaignStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'])

export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

// File: CampaignMode.schema.ts

export const CampaignModeSchema = z.enum(['OUTBOUND_LIST', 'INBOUND_OPEN', 'WEB_LINK'])

export type CampaignMode = z.infer<typeof CampaignModeSchema>;

// File: CampaignChannel.schema.ts

export const CampaignChannelSchema = z.enum(['VOICE', 'WEB'])

export type CampaignChannel = z.infer<typeof CampaignChannelSchema>;

// File: CampaignPriority.schema.ts

export const CampaignPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH'])

export type CampaignPriority = z.infer<typeof CampaignPrioritySchema>;

// File: CampaignContactStatus.schema.ts

export const CampaignContactStatusSchema = z.enum(['PENDING', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED', 'DO_NOT_CONTACT', 'PAUSED', 'RESCHEDULED', 'CANCELLED'])

export type CampaignContactStatus = z.infer<typeof CampaignContactStatusSchema>;

// File: CampaignAccessLinkKind.schema.ts

export const CampaignAccessLinkKindSchema = z.enum(['OPEN', 'PERSONALIZED'])

export type CampaignAccessLinkKind = z.infer<typeof CampaignAccessLinkKindSchema>;

// File: CampaignSessionDirection.schema.ts

export const CampaignSessionDirectionSchema = z.enum(['INBOUND', 'OUTBOUND', 'WEB'])

export type CampaignSessionDirection = z.infer<typeof CampaignSessionDirectionSchema>;

// File: CampaignSessionStatus.schema.ts

export const CampaignSessionStatusSchema = z.enum(['QUEUED', 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED', 'PAUSED', 'RESCHEDULED'])

export type CampaignSessionStatus = z.infer<typeof CampaignSessionStatusSchema>;

// File: WorkflowRunStatus.schema.ts

export const WorkflowRunStatusSchema = z.enum(['PENDING', 'RUNNING', 'WAITING', 'SUCCEEDED', 'FAILED', 'CANCELLED'])

export type WorkflowRunStatus = z.infer<typeof WorkflowRunStatusSchema>;

// File: WorkflowTriggerType.schema.ts

export const WorkflowTriggerTypeSchema = z.enum(['WEBHOOK', 'SCHEDULE', 'MANUAL', 'TEST'])

export type WorkflowTriggerType = z.infer<typeof WorkflowTriggerTypeSchema>;

// File: WorkflowStepStatus.schema.ts

export const WorkflowStepStatusSchema = z.enum(['PENDING', 'RUNNING', 'WAITING', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED'])

export type WorkflowStepStatus = z.infer<typeof WorkflowStepStatusSchema>;

// File: WorkflowWaitKind.schema.ts

export const WorkflowWaitKindSchema = z.enum(['AGENT_SESSION', 'HUMAN_APPROVAL', 'SCHEDULE', 'HTTP_CALLBACK'])

export type WorkflowWaitKind = z.infer<typeof WorkflowWaitKindSchema>;

// File: WorkflowWaitStatus.schema.ts

export const WorkflowWaitStatusSchema = z.enum(['PENDING', 'RESUMED', 'EXPIRED', 'CANCELLED'])

export type WorkflowWaitStatus = z.infer<typeof WorkflowWaitStatusSchema>;

// File: WorkflowApprovalChannel.schema.ts

export const WorkflowApprovalChannelSchema = z.enum(['WEB', 'EMAIL'])

export type WorkflowApprovalChannel = z.infer<typeof WorkflowApprovalChannelSchema>;

// File: WorkflowApprovalDecision.schema.ts

export const WorkflowApprovalDecisionSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'])

export type WorkflowApprovalDecision = z.infer<typeof WorkflowApprovalDecisionSchema>;

// File: KnowledgeBaseStatus.schema.ts

export const KnowledgeBaseStatusSchema = z.enum(['ACTIVE', 'ARCHIVED', 'DELETED'])

export type KnowledgeBaseStatus = z.infer<typeof KnowledgeBaseStatusSchema>;

// File: DocumentSourceType.schema.ts

export const DocumentSourceTypeSchema = z.enum(['UPLOAD', 'URL', 'TEXT', 'API'])

export type DocumentSourceType = z.infer<typeof DocumentSourceTypeSchema>;

// File: DocumentStatus.schema.ts

export const DocumentStatusSchema = z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED', 'DELETED'])

export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

// File: SipTrunkDirection.schema.ts

export const SipTrunkDirectionSchema = z.enum(['INBOUND', 'OUTBOUND'])

export type SipTrunkDirection = z.infer<typeof SipTrunkDirectionSchema>;

// File: EgressJobType.schema.ts

export const EgressJobTypeSchema = z.enum(['ROOM_COMPOSITE', 'PARTICIPANT', 'TRACK', 'WEB'])

export type EgressJobType = z.infer<typeof EgressJobTypeSchema>;

// File: EgressJobStatus.schema.ts

export const EgressJobStatusSchema = z.enum(['STARTING', 'ACTIVE', 'ENDING', 'COMPLETE', 'FAILED', 'ABORTED'])

export type EgressJobStatus = z.infer<typeof EgressJobStatusSchema>;

// File: UsageMetricSource.schema.ts

export const UsageMetricSourceSchema = z.enum(['AGENT', 'CAMPAIGN', 'SESSION'])

export type UsageMetricSource = z.infer<typeof UsageMetricSourceSchema>;

// File: UsageMetricCategory.schema.ts

export const UsageMetricCategorySchema = z.enum(['LLM', 'STT', 'TTS', 'AVATAR', 'SIP', 'EGRESS', 'ROOM'])

export type UsageMetricCategory = z.infer<typeof UsageMetricCategorySchema>;

// File: UsageModality.schema.ts

export const UsageModalitySchema = z.enum(['LLM', 'REALTIME', 'STT', 'TTS', 'VAD', 'AVATAR', 'SIP', 'LIVEKIT_ROOM', 'EGRESS'])

export type UsageModality = z.infer<typeof UsageModalitySchema>;

// File: UnitSource.schema.ts

export const UnitSourceSchema = z.enum(['BYOK', 'PLATFORM'])

export type UnitSource = z.infer<typeof UnitSourceSchema>;

// File: CallbackScheduleStatus.schema.ts

export const CallbackScheduleStatusSchema = z.enum(['PENDING', 'QUEUED', 'COMPLETED', 'CANCELLED', 'FAILED'])

export type CallbackScheduleStatus = z.infer<typeof CallbackScheduleStatusSchema>;

// File: CallbackScheduleSource.schema.ts

export const CallbackScheduleSourceSchema = z.enum(['RESCHEDULE', 'VOICEMAIL', 'MANUAL'])

export type CallbackScheduleSource = z.infer<typeof CallbackScheduleSourceSchema>;

// File: ProviderRateUnit.schema.ts

export const ProviderRateUnitSchema = z.enum(['TOKEN', 'MINUTE', 'CHARACTER', 'REQUEST'])

export type ProviderRateUnit = z.infer<typeof ProviderRateUnitSchema>;

// File: User.schema.ts

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
  username: z.string().nullish(),
  role: z.string().nullish(),
  banned: z.boolean().nullish(),
  banReason: z.string().nullish(),
  banExpires: z.date().nullish(),
  onboardingComplete: z.boolean(),
  paymentsCustomerId: z.string().nullish(),
  locale: z.string().nullish(),
  twoFactorEnabled: z.boolean().nullish(),
});

export type UserType = z.infer<typeof UserSchema>;


// File: Session.schema.ts

export const SessionSchema = z.object({
  id: z.string(),
  expiresAt: z.date(),
  ipAddress: z.string().nullish(),
  userAgent: z.string().nullish(),
  userId: z.string(),
  impersonatedBy: z.string().nullish(),
  activeOrganizationId: z.string().nullish(),
  token: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SessionType = z.infer<typeof SessionSchema>;


// File: Account.schema.ts

export const AccountSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  userId: z.string(),
  accessToken: z.string().nullish(),
  refreshToken: z.string().nullish(),
  idToken: z.string().nullish(),
  expiresAt: z.date().nullish(),
  password: z.string().nullish(),
  accessTokenExpiresAt: z.date().nullish(),
  refreshTokenExpiresAt: z.date().nullish(),
  scope: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AccountType = z.infer<typeof AccountSchema>;


// File: Verification.schema.ts

export const VerificationSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.date(),
  createdAt: z.date().nullish(),
  updatedAt: z.date().nullish(),
});

export type VerificationType = z.infer<typeof VerificationSchema>;


// File: Passkey.schema.ts

export const PasskeySchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  publicKey: z.string(),
  userId: z.string(),
  credentialID: z.string(),
  counter: z.number().int(),
  deviceType: z.string(),
  backedUp: z.boolean(),
  transports: z.string().nullish(),
  createdAt: z.date().nullish(),
});

export type PasskeyType = z.infer<typeof PasskeySchema>;


// File: TwoFactor.schema.ts

export const TwoFactorSchema = z.object({
  id: z.string(),
  secret: z.string(),
  backupCodes: z.string(),
  userId: z.string(),
});

export type TwoFactorType = z.infer<typeof TwoFactorSchema>;


// File: Organization.schema.ts

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullish(),
  logo: z.string().nullish(),
  createdAt: z.date(),
  metadata: z.string().nullish(),
  paymentsCustomerId: z.string().nullish(),
});

export type OrganizationType = z.infer<typeof OrganizationSchema>;


// File: Member.schema.ts

export const MemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: z.string(),
  createdAt: z.date(),
});

export type MemberType = z.infer<typeof MemberSchema>;


// File: Invitation.schema.ts

export const InvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: z.string().nullish(),
  platformRole: z.string().default("user").nullish(),
  status: z.string(),
  expiresAt: z.date(),
  inviterId: z.string(),
});

export type InvitationType = z.infer<typeof InvitationSchema>;


// File: Purchase.schema.ts

export const PurchaseSchema = z.object({
  id: z.string(),
  organizationId: z.string().nullish(),
  userId: z.string().nullish(),
  type: PurchaseTypeSchema,
  customerId: z.string(),
  subscriptionId: z.string().nullish(),
  productId: z.string(),
  status: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Purchase = z.infer<typeof PurchaseSchema>;


// File: AuditLog.schema.ts

export const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  actorType: AuditActorTypeSchema.default("USER"),
  actionType: AuditActionTypeSchema,
  resourceType: z.string(),
  resourceId: z.string(),
  requestId: z.string().nullish(),
  ipAddress: z.string().nullish(),
  userAgent: z.string().nullish(),
  before: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  after: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type AuditLogType = z.infer<typeof AuditLogSchema>;


// File: Agent.schema.ts

export const AgentSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  status: AgentStatusSchema.default("ACTIVE"),
  draftVersionId: z.string().nullish(),
  publishedVersionId: z.string().nullish(),
  embedEnabled: z.boolean(),
  token: z.string().nullish(),
});

export type AgentType = z.infer<typeof AgentSchema>;


// File: AgentVersion.schema.ts

export const AgentVersionSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  isDraft: z.boolean().default(true),
  version: AgentVersionStatusSchema.default("DRAFT"),
  config: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type AgentVersionType = z.infer<typeof AgentVersionSchema>;


// File: AgentTrial.schema.ts

export const AgentTrialSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  label: z.string(),
  token: z.string().nullish(),
  enabled: z.boolean(),
  usageLimit: z.number().int(),
  usageCount: z.number().int(),
  expiresAt: z.date().nullish(),
});

export type AgentTrialType = z.infer<typeof AgentTrialSchema>;


// File: AgentSession.schema.ts

export const AgentSessionSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  agentId: z.string(),
  agentVersionId: z.string(),
  livekitRoomName: z.string(),
  livekitRoomSid: z.string().nullish(),
  livekitJobId: z.string().nullish(),
  livekitWorkerId: z.string().nullish(),
  channel: AgentSessionChannelSchema.default("WEB"),
  direction: AgentSessionDirectionSchema.default("NONE"),
  sipTrunkId: z.string().nullish(),
  sipDispatchRuleId: z.string().nullish(),
  sipCallId: z.string().nullish(),
  fromNumber: z.string().nullish(),
  toNumber: z.string().nullish(),
  sipAttrs: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  status: AgentSessionStatusSchema.default("QUEUED"),
  startedAt: z.date().nullish(),
  connectedAt: z.date().nullish(),
  endedAt: z.date().nullish(),
  durationMs: z.number().int().nullish(),
  endReason: SessionEndReasonSchema.nullish(),
  errorCode: z.string().nullish(),
  errorMessage: z.string().nullish(),
  configSnapshot: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  livekitSessionReport: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  recordingEnabled: z.boolean(),
  transcriptStatus: TranscriptStatusSchema.default("PENDING"),
  externalUserId: z.string().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type AgentSessionType = z.infer<typeof AgentSessionSchema>;


// File: SessionEvent.schema.ts

export const SessionEventSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  organizationId: z.string(),
  sessionId: z.string(),
  sequence: z.number().int(),
  eventType: z.string(),
  actor: SessionEventActorSchema.default("AGENT"),
  occurredAt: z.date(),
  payload: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type SessionEventType = z.infer<typeof SessionEventSchema>;


// File: Transcript.schema.ts

export const TranscriptSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  sessionId: z.string(),
  agentId: z.string(),
  language: z.string().nullish(),
  status: TranscriptStatusSchema.default("PENDING"),
  fullText: z.string(),
  wordCount: z.number().int(),
  storageUri: z.string().nullish(),
  retentionExpiresAt: z.date().nullish(),
});

export type TranscriptType = z.infer<typeof TranscriptSchema>;


// File: TranscriptSegment.schema.ts

export const TranscriptSegmentSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  transcriptId: z.string(),
  sessionId: z.string(),
  sequence: z.number().int(),
  role: TranscriptRoleSchema,
  speakerIdentity: z.string().nullish(),
  text: z.string(),
  startMs: z.number().int().nullish(),
  endMs: z.number().int().nullish(),
  confidence: z.number().nullish(),
  isFinal: z.boolean(),
  interrupted: z.boolean(),
  livekitMessageId: z.string().nullish(),
  metrics: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type TranscriptSegmentType = z.infer<typeof TranscriptSegmentSchema>;


// File: ToolCallRecord.schema.ts

export const ToolCallRecordSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  organizationId: z.string(),
  sessionId: z.string(),
  transcriptSegmentId: z.string().nullish(),
  toolName: z.string(),
  arguments: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  result: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  status: ToolCallStatusSchema.default("COMPLETED"),
  error: z.string().nullish(),
  startedAt: z.date().nullish(),
  completedAt: z.date().nullish(),
});

export type ToolCallRecordType = z.infer<typeof ToolCallRecordSchema>;


// File: Campaign.schema.ts

export const CampaignSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  agentId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  status: CampaignStatusSchema.default("DRAFT"),
  mode: CampaignModeSchema,
  channel: CampaignChannelSchema,
  priority: CampaignPrioritySchema.default("NORMAL"),
  contextSchema: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("[]"),
  startAt: z.date().nullish(),
  endAt: z.date().nullish(),
  timezone: z.string().default("UTC").nullish(),
  callingWindowStartHour: z.number().int().nullish(),
  callingWindowEndHour: z.number().int().nullish(),
  maxConcurrentSessions: z.number().int().default(1),
  maxAttemptsPerContact: z.number().int().default(3),
  retryDelayMinutes: z.number().int().default(60),
  publicToken: z.string().nullish(),
  embedEnabled: z.boolean(),
  inboundAddress: z.string().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type CampaignType = z.infer<typeof CampaignSchema>;


// File: CampaignContact.schema.ts

export const CampaignContactSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  campaignId: z.string(),
  displayName: z.string().nullish(),
  phoneE164: z.string().nullish(),
  email: z.string().nullish(),
  timezone: z.string().nullish(),
  locale: z.string().nullish(),
  externalId: z.string().nullish(),
  context: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  status: CampaignContactStatusSchema.default("PENDING"),
  attemptCount: z.number().int(),
  lastAttemptAt: z.date().nullish(),
  nextAttemptAt: z.date().nullish(),
  lastOutcome: z.string().nullish(),
  doNotContact: z.boolean(),
  consentGiven: z.boolean(),
  consentAt: z.date().nullish(),
  consentSource: z.string().nullish(),
  memorySummary: z.string().nullish(),
  memoryUpdatedAt: z.date().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type CampaignContactType = z.infer<typeof CampaignContactSchema>;


// File: CampaignAccessLink.schema.ts

export const CampaignAccessLinkSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  campaignId: z.string(),
  contactId: z.string().nullish(),
  kind: CampaignAccessLinkKindSchema,
  token: z.string(),
  enabled: z.boolean().default(true),
  label: z.string().nullish(),
  contextOverrides: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  expiresAt: z.date().nullish(),
  maxUses: z.number().int().nullish(),
  useCount: z.number().int(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type CampaignAccessLinkType = z.infer<typeof CampaignAccessLinkSchema>;


// File: CampaignSession.schema.ts

export const CampaignSessionSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  campaignId: z.string(),
  contactId: z.string().nullish(),
  accessLinkId: z.string().nullish(),
  channel: CampaignChannelSchema,
  direction: CampaignSessionDirectionSchema.default("WEB"),
  status: CampaignSessionStatusSchema.default("STARTED"),
  startedAt: z.date(),
  endedAt: z.date().nullish(),
  contextSnapshot: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  outcome: z.string().nullish(),
  summary: z.string().nullish(),
  transcript: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  messages: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  recordingUrl: z.string().nullish(),
  durationSeconds: z.number().int().nullish(),
  livekitRoomName: z.string().nullish(),
  livekitRoomSid: z.string().nullish(),
  parentSessionId: z.string().nullish(),
  egressId: z.string().nullish(),
  egressStatus: z.string().nullish(),
  agentSessionId: z.string().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type CampaignSessionType = z.infer<typeof CampaignSessionSchema>;


// File: CampaignWorkflow.schema.ts

export const CampaignWorkflowSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  campaignId: z.string(),
  envVars: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("[]"),
  draftNodes: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("[]"),
  draftEdges: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("[]"),
  draftViewport: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  webhookToken: z.string().default(() => generateCuid()),
  publishedVersionId: z.string().nullish(),
});

export type CampaignWorkflowType = z.infer<typeof CampaignWorkflowSchema>;


// File: CampaignWorkflowVersion.schema.ts

export const CampaignWorkflowVersionSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  workflowId: z.string(),
  version: z.number().int(),
  nodes: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10"),
  edges: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10"),
  viewport: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  publishedAt: z.date(),
  label: z.string().nullish(),
});

export type CampaignWorkflowVersionType = z.infer<typeof CampaignWorkflowVersionSchema>;


// File: WorkflowRun.schema.ts

export const WorkflowRunSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  campaignId: z.string(),
  workflowId: z.string(),
  workflowVersionId: z.string(),
  status: WorkflowRunStatusSchema.default("PENDING"),
  triggerType: WorkflowTriggerTypeSchema,
  triggerPayload: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  envSnapshot: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  context: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  cursor: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  error: z.string().nullish(),
  startedAt: z.date().nullish(),
  finishedAt: z.date().nullish(),
  claimedAt: z.date().nullish(),
  claimToken: z.string().nullish(),
});

export type WorkflowRunType = z.infer<typeof WorkflowRunSchema>;


// File: WorkflowStep.schema.ts

export const WorkflowStepSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  runId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: WorkflowStepStatusSchema.default("PENDING"),
  attempt: z.number().int().default(1),
  input: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  output: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  error: z.string().nullish(),
  startedAt: z.date().nullish(),
  finishedAt: z.date().nullish(),
});

export type WorkflowStepType = z.infer<typeof WorkflowStepSchema>;


// File: WorkflowWait.schema.ts

export const WorkflowWaitSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  runId: z.string(),
  stepId: z.string(),
  kind: WorkflowWaitKindSchema,
  status: WorkflowWaitStatusSchema.default("PENDING"),
  externalId: z.string().nullish(),
  resumeAt: z.date().nullish(),
  payload: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  resumePayload: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
});

export type WorkflowWaitType = z.infer<typeof WorkflowWaitSchema>;


// File: WorkflowApproval.schema.ts

export const WorkflowApprovalSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  runId: z.string(),
  stepId: z.string(),
  waitId: z.string(),
  token: z.string().default(() => generateCuid()),
  channel: WorkflowApprovalChannelSchema,
  decision: WorkflowApprovalDecisionSchema.default("PENDING"),
  message: z.string().nullish(),
  decidedBy: z.string().nullish(),
  decidedAt: z.date().nullish(),
  expiresAt: z.date().nullish(),
  emailTo: z.string().nullish(),
});

export type WorkflowApprovalType = z.infer<typeof WorkflowApprovalSchema>;


// File: KnowledgeBase.schema.ts

export const KnowledgeBaseSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  embeddingModel: z.string().default("text-embedding-3-small"),
  embeddingDim: z.number().int().default(1536),
  status: KnowledgeBaseStatusSchema.default("ACTIVE"),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type KnowledgeBaseType = z.infer<typeof KnowledgeBaseSchema>;


// File: Document.schema.ts

export const DocumentSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  knowledgeBaseId: z.string(),
  title: z.string(),
  sourceType: DocumentSourceTypeSchema.default("UPLOAD"),
  sourceUrl: z.string().nullish(),
  storageKey: z.string().nullish(),
  status: DocumentStatusSchema.default("PENDING"),
  errorMessage: z.string().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type DocumentType = z.infer<typeof DocumentSchema>;


// File: DocumentChunk.schema.ts

export const DocumentChunkSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  documentId: z.string(),
  content: z.string(),
  chunkIndex: z.number().int(),
  tokenCount: z.number().int().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  embedding: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
});

export type DocumentChunkType = z.infer<typeof DocumentChunkSchema>;


// File: AgentKnowledgeBase.schema.ts

export const AgentKnowledgeBaseSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  agentId: z.string(),
  knowledgeBaseId: z.string(),
});

export type AgentKnowledgeBaseType = z.infer<typeof AgentKnowledgeBaseSchema>;


// File: CampaignKnowledgeBase.schema.ts

export const CampaignKnowledgeBaseSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  campaignId: z.string(),
  knowledgeBaseId: z.string(),
});

export type CampaignKnowledgeBaseType = z.infer<typeof CampaignKnowledgeBaseSchema>;


// File: PhoneNumber.schema.ts

export const PhoneNumberSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  campaignId: z.string().nullish(),
  agentId: z.string().nullish(),
  sipTrunkId: z.string().nullish(),
  e164: z.string(),
  plivoNumberId: z.string().nullish(),
  friendlyName: z.string().nullish(),
  capabilities: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type PhoneNumberType = z.infer<typeof PhoneNumberSchema>;


// File: SipTrunk.schema.ts

export const SipTrunkSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  name: z.string(),
  direction: SipTrunkDirectionSchema,
  livekitTrunkId: z.string().nullish(),
  plivoTrunkId: z.string().nullish(),
  plivoUriId: z.string().nullish(),
  plivoCredentialId: z.string().nullish(),
  authUsername: z.string().nullish(),
  hasCredentials: z.boolean(),
  numbers: z.array(z.string()),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type SipTrunkType = z.infer<typeof SipTrunkSchema>;


// File: DispatchRule.schema.ts

export const DispatchRuleSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  sipTrunkId: z.string().nullish(),
  agentId: z.string().nullish(),
  campaignId: z.string().nullish(),
  name: z.string(),
  livekitDispatchRuleId: z.string().nullish(),
  roomPrefix: z.string().nullish(),
  ruleConfig: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type DispatchRuleType = z.infer<typeof DispatchRuleSchema>;


// File: CustomVoice.schema.ts

export const CustomVoiceSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  name: z.string(),
  livekitVoiceId: z.string().nullish(),
  sampleStorageKeys: z.array(z.string()),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type CustomVoiceType = z.infer<typeof CustomVoiceSchema>;


// File: EgressJob.schema.ts

export const EgressJobSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  campaignSessionId: z.string().nullish(),
  agentSessionId: z.string().nullish(),
  agentId: z.string().nullish(),
  livekitEgressId: z.string().nullish(),
  type: EgressJobTypeSchema,
  status: EgressJobStatusSchema.default("STARTING"),
  roomName: z.string().nullish(),
  outputUrls: z.array(z.string()),
  destination: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  fileUrl: z.string().nullish(),
  durationMs: z.number().int().nullish(),
  sizeBytes: z.number().int().nullish(),
  errorMessage: z.string().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type EgressJob = z.infer<typeof EgressJobSchema>;


// File: AvatarProfile.schema.ts

export const AvatarProfileSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  name: z.string(),
  anamAvatarId: z.string(),
  anamPersonaId: z.string().nullish(),
  previewUrl: z.string().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type AvatarProfileType = z.infer<typeof AvatarProfileSchema>;


// File: UsageMetric.schema.ts

export const UsageMetricSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  organizationId: z.string(),
  agentId: z.string().nullish(),
  campaignId: z.string().nullish(),
  campaignSessionId: z.string().nullish(),
  source: UsageMetricSourceSchema,
  category: UsageMetricCategorySchema,
  provider: z.string().nullish(),
  metric: z.string(),
  value: z.string().regex(/^-?\d{1,10}(?:\.\d{1,8})?$/, "Invalid decimal format"),
  unit: z.string(),
  recordedAt: z.date(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type UsageMetricType = z.infer<typeof UsageMetricSchema>;


// File: SessionUsage.schema.ts

export const SessionUsageSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  sessionId: z.string(),
  agentId: z.string(),
  modality: UsageModalitySchema,
  provider: z.string(),
  model: z.string(),
  unitSource: UnitSourceSchema.default("BYOK"),
  inputTokens: z.number().int(),
  inputCachedTokens: z.number().int(),
  inputCachedAudioTokens: z.number().int(),
  inputCachedTextTokens: z.number().int(),
  inputCachedImageTokens: z.number().int(),
  inputAudioTokens: z.number().int(),
  inputTextTokens: z.number().int(),
  inputImageTokens: z.number().int(),
  outputTokens: z.number().int(),
  outputAudioTokens: z.number().int(),
  outputTextTokens: z.number().int(),
  providerSessionDurationMs: z.number().int(),
  charactersCount: z.number().int(),
  audioDurationMs: z.number().int(),
  totalRequests: z.number().int(),
  videoDurationMs: z.number().int(),
  callDurationMs: z.number().int(),
  billableMinutes: z.number().int(),
  participantMinutes: z.number().int(),
  egressMinutes: z.number().int(),
  egressBytes: z.number().int(),
  raw: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  capturedAt: z.date(),
  isFinal: z.boolean(),
});

export type SessionUsageType = z.infer<typeof SessionUsageSchema>;


// File: SessionCollectedField.schema.ts

export const SessionCollectedFieldSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  sessionId: z.string(),
  agentId: z.string(),
  key: z.string(),
  label: z.string().nullish(),
  fieldType: z.string().default("string"),
  value: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("null"),
  required: z.boolean(),
  capturedAt: z.date(),
});

export type SessionCollectedFieldType = z.infer<typeof SessionCollectedFieldSchema>;


// File: CallbackSchedule.schema.ts

export const CallbackScheduleSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string(),
  sessionId: z.string().nullish(),
  campaignId: z.string().nullish(),
  campaignContactId: z.string().nullish(),
  phoneE164: z.string(),
  scheduledAt: z.date(),
  status: CallbackScheduleStatusSchema.default("PENDING"),
  source: CallbackScheduleSourceSchema.default("RESCHEDULE"),
  contactMetadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  errorMessage: z.string().nullish(),
  completedSessionId: z.string().nullish(),
});

export type CallbackScheduleType = z.infer<typeof CallbackScheduleSchema>;


// File: ProviderRate.schema.ts

export const ProviderRateSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string().nullish(),
  modality: UsageModalitySchema,
  provider: z.string(),
  model: z.string().nullish(),
  unit: ProviderRateUnitSchema,
  unitAmountMicros: z.number().int(),
  currency: z.string().default("USD"),
  unitSource: UnitSourceSchema.nullish(),
  effectiveFrom: z.date(),
  effectiveTo: z.date().nullish(),
});

export type ProviderRateType = z.infer<typeof ProviderRateSchema>;

