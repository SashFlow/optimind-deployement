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

```python
report = ctx.make_session_report()
usage = report.get("usage")  # or session.usage
```

```http
POST /api/internal/sessions/{session_id}/report
X-Worker-Api-Key: ...
{
  "report": { ... },
  "usage": { ... },
  "metrics": [],
  "isFinal": true
}
```

Then:

```http
PATCH /api/internal/sessions/{session_id}/lifecycle
X-Worker-Api-Key: ...
{ "status": "COMPLETED", "endReason": "COMPLETED" }
```

The report handler:

- stores `livekitSessionReport`
- extracts conversation history → `Transcript` + `TranscriptSegment`
- upserts `SessionUsage` rows from `usage.model_usage`

## Org-authenticated APIs

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/sessions` | Create `AgentSession` + LiveKit room/dispatch |
| `GET` | `/api/sessions` | List sessions |
| `GET` | `/api/sessions/{id}` | Session + transcript + usage + egress |
| `POST` | `/api/sessions/{id}/egress` | Start room-composite egress → S3 |

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
| `S3_ENDPOINT_URL` | Optional (path-style) for MinIO/R2 |
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit |

## Reference worker

See `optimind_operations/worker/main.py` for the prior implementation. Port those hooks to call the endpoints above instead of writing egress without an `EgressJob` row, and rely on `/report` to materialize transcripts.
