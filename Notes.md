Your Prisma schema covers auth/org + a redesigned campaign/KB surface, but it’s missing several **core domains** that exist in the SQLModel backend (`backend/src/models/`).

## Entire domains missing from Prisma

| Domain | Backend models | Why it matters |
|---|---|---|
| **Provider catalog** | `Provider`, `ProviderModel`, `ProviderVoice`, `OrgProviderCredential` | LLM/STT/TTS/realtime/avatar registry + org BYOK credentials |
| **Tools** | `ToolDefinition`, `AgentToolLink` | Agent tool defs linked per `AgentVersion` |
| **Runtime sessions** | `AgentSession`, `SessionParticipant`, `SessionEvent` | LiveKit room sessions (not only campaign sessions) |
| **Transcripts** | `Transcript`, `TranscriptSegment`, `ToolCallRecord` | Structured transcripts + tool-call audit |
| **Billing ledger** | `SessionUsage`, `SessionTurnMetric`, `PricingRateCard`, `UsageLedgerEntry`, `OrgBillingAccount`, `BillingPeriod`, `Invoice` | Usage metering, pricing, balances, invoices (Prisma only has `Purchase` + flat `UsageMetric`) |
| **Jobs** | `BackgroundJob` | Campaign dial / egress / knowledge ingest / Plivo provision |
| **Analytics** | `TrackingEvent` | Product/event tracking with idempotency |
| **Dialer queue** | `CampaignQueueItem` | Scheduled outbound queue (status, attempt, scheduled_at, session link) |

## Overlapping models — important fields still missing

**Agent / AgentVersion / AgentTrial**
- `Agent.slug`, `is_deleted`
- `AgentVersion.version` as **int** + `label` (Prisma uses enum status only)
- `AgentTrial.organization_id`, `name`, `included_minutes`, `included_sessions`

**Campaign**
- Direct `sip_trunk_id`
- Backend is simpler outbound; Prisma adds modes/links/sessions, but still lacks `CampaignQueueItem`

**Telephony**
- `SipTrunk`: `address`, `allowed_addresses`, `auth_password`, `transport`, `srtp_enabled`, `krisp_enabled`, `headers`, `provider`, `status`, `is_deleted`
- `SipDispatchRule`: `rule_type`, required `agent_id`, `numbers[]`, `is_enabled`, `is_deleted`
- `PhoneNumber`: `provider_sid`, `is_active`, `is_deleted` (Prisma has Plivo/campaign fields instead)

**Knowledge**
- Backend: `KnowledgeSource` + `KnowledgeDocument` (S3 key, size, chunk_count, indexing_status)
- Prisma: different shape (`KnowledgeBase` / `Document` / `DocumentChunk`) — no 1:1 for `indexing_status`, `document_count`, soft-delete

**Egress**
- Backend ties to `AgentSession` + `agent_id`, plus `destination`, `file_url`, `duration_ms`, `size_bytes`
- Prisma ties to `CampaignSession` only

**Avatar**
- Backend `OrgAvatar`: `provider_id`, `external_avatar_id`, `config`, `is_enabled`
- Prisma `AvatarProfile` is Anam-specific (`anamAvatarId`, `anamPersonaId`) — no provider FK

**Audit**
- Backend: nullable org/actor, `occurred_at`, nullable before/after
- Prisma: required user/org/ip/userAgent/before/after — closer to auth audit than platform audit

## Auth note (not really “missing”)

Prisma’s Better Auth stack (`User`, `Session`, `Passkey`, `TwoFactor`, `Verification`, `Member`, `Invitation`, `Purchase`) **replaces** backend auth (`Account`, `OrganizationAccountJoin`, `AccountInvite`, `AccountSession`, `PasswordResetToken`). That’s intentional redesign, not a gap — unless you still need password-reset / invite token semantics mapped explicitly.

---

**Bottom line:** Prisma is missing the provider/tools/session/transcript/billing-job stack that the current backend is built around. Campaign/KB look expanded in Prisma, but dialer queue + first-class agent sessions (outside campaigns) are still absent.

If you want, I can next map a recommended Prisma model list that would bring parity with the backend without dumping Better Auth.
