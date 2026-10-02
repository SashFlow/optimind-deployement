# ID card verification (tool-triggered)

Identity verification is **not** a mandatory popup on join. When proctoring and ID
verification are enabled, the agent opens the capture overlay by calling LiveKit RPC
`start_id_capture` on the candidate (typically from a Python `@function_tool`).

After a good frame is detected, the web client uploads two JPEGs to the backend and
notifies the agent via `add_context`.

## Setup

1. In **Call Session**, enable **Proctoring** and **ID verification**
   (“Allow the agent to request ID card capture during the session (via a tool call).”).
2. Create an org **Python tool** (Tools → Create Python tool) and paste the sample below.
3. Attach that tool to the agent so the model can call `verify_identity` mid-session.
4. Start a web (share / embed / preview) session with the camera on.

## Flow

```
Agent tool verify_identity
  → perform_rpc("start_id_capture") on candidate
  → Client opens ID overlay and scans camera frames
  → POST /sessions/{id}/participant-files  (id-card.jpg)
  → POST /sessions/{id}/participant-files  (id-card-full.jpg)
  → Client perform_rpc("add_context") with type "id_captured" (action: generate_reply)
  → Agent chat gets a system message; agent acknowledges and continues
```

### RPC: `start_id_capture` (agent → candidate)

- Registered only when `session_modalities.proctoring.id_verification` is true.
- Payload: empty string (or unused).
- Response: `{"started": true}` (JSON string).

### Upload: participant files

Authenticated with the candidate’s LiveKit participant JWT:

| Name | Content |
|------|---------|
| `id-card.jpg` | Cropped ID card JPEG |
| `id-card-full.jpg` | Full-frame evidence JPEG |

Endpoint: `POST /sessions/{id}/participant-files` (see worker / public session APIs).

### RPC: `add_context` (candidate → agent)

After a successful upload the client injects a **system message** into the agent session
via `add_context` (worker: `role="system"`, then `generate_reply` so the agent continues):

```json
{
  "state": "ID card capture completed successfully. The candidate's ID images have been uploaded and submitted for verification. You may continue the conversation.",
  "action": "generate_reply",
  "type": "id_captured",
  "details": {
    "confidence": 0.0,
    "capturedAt": 0,
    "status": "completed"
  }
}
```

The worker stores this as a system message, e.g.
`Frontend event (id_captured): ID card capture completed successfully...`, then asks the
agent to briefly acknowledge and continue.

## Sample Python tool

Paste into **Create Python Tool**. The worker injects `host` (`.agent`, `.ctx`, `.state`).

```python
from livekit.agents import function_tool, RunContext
from livekit import rtc


class Tools:
    def __init__(self, host):
        self.host = host  # .ctx, .state, .agent (agent set after session start)

    def _room(self):
        agent = self.host.agent
        session = getattr(agent, "session", None) if agent else None
        room_io = getattr(session, "_room_io", None) if session else None
        return getattr(room_io, "room", None) if room_io else None

    @function_tool()
    async def verify_identity(self, context: RunContext) -> str:
        """Ask the candidate to show their ID card for verification.

        Call this when you need the candidate to present a government ID.
        The browser opens a capture overlay; wait for confirmation that the
        ID was submitted before continuing sensitive steps.
        """
        room = self._room()
        if room is None:
            return "error: room not available yet"

        for participant in room.remote_participants.values():
            if participant.kind == rtc.ParticipantKind.AGENT:
                continue
            response = await room.local_participant.perform_rpc(
                destination_identity=participant.identity,
                method="start_id_capture",
                payload="",
            )
            return f"ID capture started: {response}"

        return "error: no candidate participant in the room"
```

### How to test

1. Enable proctoring + ID verification on the agent.
2. Add the Python tool above and attach it to the agent.
3. Join a share/embed/preview session with camera enabled.
4. Ask the agent to verify your identity (or otherwise invoke `verify_identity`).
5. Hold an ID inside the guide frame until capture succeeds.
6. Confirm toast “ID card captured” and that `id-card.jpg` / `id-card-full.jpg` appear on the session’s participant files.

## Related

- LiveKit RPC contract: [WORKER_CONTRACT.md](./WORKER_CONTRACT.md) (`start_id_capture`, `add_context`)
- Client hook: `apps/web/hooks/useProctoring.ts`
- Upload helper: `apps/web/lib/proctoring/upload-id-capture.ts`
