# Session track-merge worker

BullMQ consumer that merges per-role LiveKit track egress files (`user_video`,
`user_audio`, `agent_audio`) into one session recording.

Alignment and mix match `python_compose/` (egress-canvas compose):

1. Prefer each track's `fileStartedAtNs`, else `startedAtNs`
2. Earliest align time → session `t=0`
3. Place user + agent audio on a shared 48 kHz canvas (additive mix + soft clip)
4. Pad user video with `tpad`, then mux with the mixed audio

The Node worker downloads tracks (LiveKit listEgress + DB fallback), then shells
out to `python_compose/compose_merge.py`.

## Requirements

- `REDIS_URL` pointing at a Redis instance
- Recordings S3 credentials (`S3_BUCKET_RECORDINGS` + access keys; see root `.env.example`)
- System `ffmpeg` on `PATH`
- Python 3 with `numpy`, `soundfile`, `torch`, `torchaudio` (see `python_compose/requirements.txt`)

## Run

Start **separately** from the web app (recommended for prod and local):

```bash
# terminal 1 — Next.js API / web
pnpm dev
# or: pnpm start

# terminal 2 — track-merge worker (needs REDIS_URL + ffmpeg + Python)
pnpm dev:worker
# or: pnpm start:worker
```

Both together (optional):

```bash
pnpm dev:all
pnpm start:all
```

## Docker

Build from the monorepo root (worker image includes `ffmpeg` + compose Python deps):

```bash
pnpm docker:build:web      # Dockerfile → optimind-saas
pnpm docker:build:worker   # Dockerfile.worker → optimind-worker
```

```bash
docker run --env-file .env.local optimind-worker
```

Required runtime env: `REDIS_URL`, `DATABASE_URL`, recordings bucket credentials,
LiveKit credentials.

## Local sample

```bash
pnpm --filter @repo/worker merge:local -- --session <sessionId> [--out <dir>]
```

Offline compose against local files / LiveKit timestamps:

```bash
python apps/worker/python_compose/compose_session.py <room>
```
