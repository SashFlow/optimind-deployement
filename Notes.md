From what you’re actually storing (`AgentSession` + related tables), here’s a full catalog of what you *can* surface — regardless of what’s on the dashboard today.

---

## 1. Session / call operations

**KPIs**
- Total / active / completed / failed / cancelled sessions
- Success rate, failure rate
- Avg / median / p95 duration
- Time-to-connect (`connectedAt − startedAt`)
- Abandon / hangup rates by `endReason` (participant left, room finished, timeout, error, cancelled)
- Concurrent sessions (peak & average)
- Sessions by agent / agent version

**Charts**
- Sessions over time (daily/hourly)
- Duration distribution (histogram)
- Status mix (stacked area)
- Channel mix: WEB / SIP / PHONE
- Direction mix: INBOUND / OUTBOUND / WEB
- End-reason breakdown (pie/bar)
- Heatmap: hour-of-day × day-of-week volume

**Tables**
- Session list: agent, channel, direction, from/to, status, duration, end reason, timestamps
- Failures list: error code/message, agent, time
- Live “active now” board (QUEUED / ACTIVE)

---

## 2. Telephony

**KPIs**
- Total SIP/phone minutes (inbound vs outbound)
- SIP session count
- Unique numbers dialed / received
- Answer rate (connected vs attempted — via status + `connectedAt`)
- Avg talk time on phone vs web

**Charts**
- Inbound vs outbound minutes over time
- SIP sessions daily
- Top calling / called numbers
- Trunk / dispatch-rule usage volume

**Tables**
- Call detail: from, to, trunk, SIP call ID, duration, outcome
- Number performance: attempts, connects, avg duration, fail rate
- Trunk health: sessions, errors, utilization

---

## 3. Campaign / dialer funnel

**KPIs**
- Contacts: pending → queued → in progress → completed / failed / DNC / rescheduled
- Contact completion rate
- Attempts per contact (avg vs `maxAttemptsPerContact`)
- Retry rate, reschedule rate
- Consent rate (`consentGiven`)
- Concurrent utilization vs `maxConcurrentSessions`
- Access-link usage (`useCount` / `maxUses`)
- Outcomes distribution (`lastOutcome` / session `outcome`)

**Charts**
- Funnel: uploaded → dialed → connected → completed
- Attempts over time
- Outcome mix by campaign
- Calling-window adherence (sessions inside vs outside window)
- Campaign comparison: completion %, avg attempts, avg duration

**Tables**
- Contact queue: status, attempt count, next attempt, last outcome, DNC
- Campaign session list: outcome, summary, duration, recording, linked agent session
- Access links: uses remaining, expires, personalized vs open
- Do-not-contact / consent audit list

---

## 4. Conversation quality (transcripts)

**KPIs**
- Avg word count / session
- Turn count (user vs assistant)
- Talk ratio (user speaking time vs agent)
- Interruption rate (`TranscriptSegment.interrupted`)
- Avg STT confidence
- Transcript completeness (`PENDING` / `PARTIAL` / `FINAL` / `FAILED`)
- Language mix (when set)

**Charts**
- Talk-ratio distribution
- Turns per session over time
- Interruption trend by agent
- Word-count vs duration scatter

**Tables**
- Segment timeline per session (role, text, start/end ms, confidence, interrupted)
- Sessions with missing/failed transcripts
- Longest / shortest conversations

---

## 5. Agent latency & realtime metrics

From `SessionEvent` (`agent.metric.*`) and segment `metrics` JSON:

**KPIs**
- TTFT / LLM latency (avg, p50, p95)
- STT latency, TTS TTFB
- End-to-end response delay
- Metric event volume by type

**Charts**
- Latency time series by agent / model
- Latency percentiles box/violin
- Metric heatmap by hour

**Tables**
- Per-session metric summary
- Slowest sessions (by latency event)

---

## 6. Tools & agent actions

**KPIs**
- Tool calls per session
- Tool success / failure rate
- Avg tool latency (`completedAt − startedAt`)
- Most-used tools
- Transfer rate (`transfer_started`)
- End-call initiated by agent vs user
- Reschedule rate (`reschedule_requested`)
- AMD / voicemail rate (`amd_result`, voicemail events)

**Charts**
- Tool usage bar (by name)
- Tool error rate over time
- AMD category mix (human / machine / unknown)
- Transfer funnel

**Tables**
- Tool call log: name, args, result, status, error, timing
- Transfer / reschedule / voicemail event log
- Sessions that hit voicemail retry

---

## 7. Usage, cost drivers & billing inputs

From `SessionUsage` (LLM / STT / TTS / realtime / SIP / egress / etc.):

**KPIs**
- Total tokens (in/out/cached) by modality
- Audio minutes (STT / TTS / call)
- TTS character count
- Requests per modality
- Usage by provider / model
- BYOK vs LiveKit Inference vs platform (`unitSource`)
- Cost *estimates* if you attach a price sheet (no cost table yet — but you have the units)

**Charts**
- Token burn over time
- Stacked usage by modality
- Provider/model mix
- Cost drivers: tokens vs audio minutes vs egress
- Per-agent usage comparison

**Tables**
- Usage breakdown per session × modality × provider × model
- Top agents by token / minute spend
- Org usage rollup for billing period

---

## 8. Recordings / egress

**KPIs**
- Recording enabled rate
- Egress success / fail / abort rate
- Total recording minutes & storage bytes
- Avg recording duration
- Egress by type (room composite / participant / track / web)

**Charts**
- Egress volume by type over time
- Storage growth (bytes)
- Failure reasons

**Tables**
- Recording library: session, file URL, duration, size, status
- Failed egress jobs with error message

---

## 9. Agent & version performance

**KPIs**
- Sessions / success / duration by agent
- Version A/B comparison (same agent, different `agentVersionId`)
- Config-era comparison (via `configSnapshot`)
- Trial usage (`AgentTrial.usageCount` vs limit)

**Charts**
- Agent leaderboard (success %, duration, volume)
- Version rollout impact (before/after)

**Tables**
- Agent scorecard
- Version changelog impact on metrics

---

## 10. Workflows (campaign orchestration)

**KPIs**
- Workflow runs started / completed / waiting / failed
- Wait time on `AGENT_SESSION`
- Approval pending count / SLA
- Step failure rate

**Charts**
- Run throughput over time
- Bottleneck steps
- Wait duration distribution

**Tables**
- Active waits / approvals
- Failed runs with cursor + error context

---

## 11. Knowledge & content (adjacent)

**KPIs**
- Documents / chunks per knowledge base
- Agents/campaigns linked to KBs
- (If you later log retrieval events — not first-class today)

**Tables**
- KB inventory, document status, associations

---

## 12. Session timeline / audit views (rich detail pages)

Not KPIs — but high-value UI from the same data:

- Full event timeline (`SessionEvent` sequence)
- Chat transcript with tool calls interleaved
- Raw LiveKit session report (`livekitSessionReport`)
- Config at call time (`configSnapshot`)
- Linked campaign contact + memory summary
- SIP attributes / identities

---

## Highest-value gaps (data exists or almost exists, UI rarely shows)

| Area | Why it’s strong |
|---|---|
| **SessionUsage** | Real cost/ops story — tokens, audio, provider/model |
| **Tool + AMD + transfer events** | Call-center quality & automation health |
| **Campaign contact funnel** | Dialer ROI |
| **Transcript quality** | Talk ratio, interruptions, confidence |
| **Latency metrics in events** | Agent UX / SLAs |
| **End-reason + errors** | Reliability debugging |
| **Agent version compare** | Prompt/model iteration |

---

## What you cannot cleanly show yet (without more work)

- True **dollar cost** (no price table; estimate from `SessionUsage` + external rates)
- **Collected form fields** from `data_collection_fields` (schema in config; no dedicated values table)
- **Queue / callback schedule** analytics (worker metadata exists; no DB table)
- **LiveKit Cloud** geo / WebRTC / bandwidth (dashboard stubbed; not wired)
- Campaign **outcome/recording** auto-synced from agent sessions (fields exist on `CampaignSession` but not always filled from the worker report)

---

**Bottom line:** You’re tracking a full call-center + voice-agent observability stack. The richest unused surfaces are **usage/cost**, **campaign funnel**, **conversation quality**, **tool/AMD/transfer behavior**, and **latency** — not just session counts and duration.