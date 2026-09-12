# LiveKit agent worker contract

External agent workers (not in this repo) must talk to this API using `X-Worker-Api-Key: $WORKER_API_KEY`.

## Dispatch metadata

Room/agent dispatch `metadata` is JSON matching:

```ts
{
  organization_id: string
  agent_id: string
  agent_version_id: string
  session_id: string
  config: object
  source: "web" | "campaign" | "reschedule" | "inbound" | "phone"
  recording_enabled: boolean
  channel: "WEB" | "SIP" | "PHONE"
  direction: "NONE" | "INBOUND" | "OUTBOUND" | "WEB"
  phone_number?: string | null
  from_number?: string | null
  sip_trunk_id?: string | null
  livekit_sip_trunk_id?: string | null
  campaign_id?: string | null
  campaign_contact_id?: string | null
  contact_metadata?: object
}
```

Parse this from the LiveKit job metadata when the worker joins.

## Required hooks

### 1. On session start (agent joins)

```http
PATCH /api/internal/sessions/{session_id}/lifecycle
X-Worker-Api-Key: ...
{ "status": "ACTIVE", "livekitJobId": "...", "livekitWorkerId": "..." }
```

If `recording_enabled` is true, start egress **via the API** (so an `EgressJob` row exists):

```http
POST /api/internal/sessions/{session_id}/egress
X-Worker-Api-Key: ...
{ "audioOnly": true }   # prefer true for SIP/PHONE
```

Do not start LiveKit egress only from the worker without calling this endpoint.

### 2. Live model usage

Prefer `session_usage_updated` (session-level `metrics_collected` is deprecated):

```http
POST /api/internal/sessions/{session_id}/events
X-Worker-Api-Key: ...
{
  "eventType": "session_usage_updated",
  "actor": "WORKER",
  "payload": { /* AgentSessionUsage dump */ }
}
```

Optionally also flush usage into the report endpoint periodically.

### 3. Tool calls

```http
POST /api/internal/sessions/{session_id}/tool-calls
X-Worker-Api-Key: ...
{
  "toolName": "end_call",
  "arguments": {},
  "result": "ok",
  "status": "COMPLETED"
}
```

### 4. On session end

Keep LiveKit **text input enabled** (`lk.chat`) so typed web chat enters `session.history` alongside spoken turns.

On `AgentSession` `close`, snapshot `session.history.to_dict()` / usage / metrics locally. **Do not** POST a stub report like `{ "metrics_flush": true }` — that can overwrite a good `livekitSessionReport` and wipe transcript extraction.

Inside `on_session_end`:

```python
report = ctx.make_session_report().to_dict()
# ensure chat_history.items present (fallback to close snapshot of session.history)
usage = report.get("usage")  # list OR { model_usage: [...] }
```

```http
POST /api/internal/sessions/{session_id}/report
X-Worker-Api-Key: ...
{
  "report": {
    "chat_history": { "items": [ /* message / function_call / ... */ ] },
    "events": [ /* AgentEvent dumps */ ],
    "usage": [ /* or omit; prefer top-level usage */ ],
    "...": "other SessionReport fields"
  },
  "usage": { "model_usage": [ /* LLM/STT/TTS summaries */ ] },
  "metrics": [ /* optional plugin metric dumps */ ],
  "collectedData": [
    { "key": "dob", "value": "1990-01-01", "label": "Date of birth", "fieldType": "string", "required": true }
  ],
  "isFinal": true
}
```

`usage` may be either an object (`{ model_usage: [...] }`) or a raw array of model usage rows.

`collectedData` is optional; when present, rows are upserted into `SessionCollectedField` and mirrored on `AgentSession.metadata.collectedData`.

Then:

```http
PATCH /api/internal/sessions/{session_id}/lifecycle
X-Worker-Api-Key: ...
{ "status": "COMPLETED", "endReason": "COMPLETED" }
```

### Callbacks / reschedule

```http
POST /api/internal/callbacks/schedule
X-Worker-Api-Key: ...
{
  "sessionId": "...",
  "scheduledAt": "2026-09-13T10:00:00+05:30",
  "phoneNumber": "+15551234567",
  "campaignId": "...",
  "contactMetadata": {},
  "source": "RESCHEDULE"
}
```

Response: `{ ok, callbackId, contactId, nextAttemptAt, status }`. Creates a `CallbackSchedule` row and, when a campaign contact is known, reschedules that contact for the dialer.

The report / terminal lifecycle handlers:

- merges into `livekitSessionReport` (never replaces a full report with a metrics-only stub)
- extracts `chat_history.items` → `Transcript` + `TranscriptSegment` (spoken + typed chat)
- upserts `SessionUsage` from `usage` / `usage.model_usage`
- materializes `report.events` → `SessionEvent` (`agent.event.*`)
- materializes function call items → `ToolCallRecord`
- appends `metrics[]` → `SessionEvent` (`agent.metric.*`)
- upserts `collectedData` → `SessionCollectedField`
- syncs linked `CampaignSession` outcome / duration / transcript / recording from the agent session

## Org-authenticated APIs

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/sessions` | Create `AgentSession` + LiveKit room/dispatch |
| `GET` | `/api/sessions` | List sessions |
| `GET` | `/api/sessions/{id}` | Session + transcript + usage + egress |
| `POST` | `/api/sessions/{id}/egress` | Start room-composite egress → S3 |
| `POST` | `/api/sessions/{id}/end` | Cancel session + delete LiveKit room |

## Webhooks

Configure LiveKit Cloud/project webhook to `POST /api/webhooks/livekit`.

Handled events:

- `egress_updated` / `egress_ended` → update `EgressJob` status + `fileUrl`
- `room_finished` → complete open `AgentSession`
- `room_started` → set `livekitRoomSid`

## Env

| Variable | Purpose |
|---|---|
| `WORKER_API_KEY` | Worker auth for `/internal/*` |
| `AGENT_NAME` | LiveKit agent name for dispatch |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET_RECORDINGS` / `S3_REGION` | Egress upload |
| `S3_ENDPOINT_URL` (or `S3_ENDPOINT`) | Optional path-style endpoint (Supabase/MinIO/R2) |
| `S3_RECORDINGS_ACCESS_KEY_ID` / `S3_RECORDINGS_SECRET_ACCESS_KEY` / `S3_RECORDINGS_REGION` | Optional overrides when knowledge + recordings use different keys |
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit |

Recording object key (backend `recordingFilepath` ↔ worker `recording_filepath`):

```
{organizationId}/{sessionId}/{roomName}.mp4
→ s3://{S3_BUCKET_RECORDINGS}/...
```

## Reference worker

See `optimind_operations/worker/main.py` for the prior implementation. Port those hooks to call the endpoints above instead of writing egress without an `EgressJob` row, and rely on `/report` to materialize transcripts.
