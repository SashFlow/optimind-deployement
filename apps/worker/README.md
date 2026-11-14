# Session track-merge worker

BullMQ consumer that merges per-role LiveKit track egress files (`user_video`,
`user_audio`, `agent_audio`) into one session recording via FFmpeg.

Alignment uses each track's LiveKit egress `startedAt` nanoseconds
(`metadata.startedAtNs` / timeUnixNano): earliest start is session `t=0`, and
later tracks are padded/delayed by `(startedAtNs - t0)`.

## Requirements

- `REDIS_URL` pointing at a Redis instance
- Recordings S3 credentials (`S3_BUCKET_RECORDINGS` + access keys; see root `.env.example`)
- System `ffmpeg` on `PATH`

## Run

Start **separately** from the web app (recommended for prod and local):

```bash
# terminal 1 — Next.js API / web
pnpm dev
# or: pnpm start

# terminal 2 — track-merge worker (needs REDIS_URL + ffmpeg)
pnpm dev:worker
# or: pnpm start:worker
```

Both together (optional):

```bash
pnpm dev:all
pnpm start:all
```

## Docker

Build from the monorepo root (worker image includes `ffmpeg`):

```bash
pnpm docker:build:web      # Dockerfile → optimind-saas
pnpm docker:build:worker   # Dockerfile.worker → optimind-worker
```

```bash
docker run --env-file .env.local optimind-worker
```

Required runtime env: `REDIS_URL`, `DATABASE_URL`, recordings bucket credentials.

## Local sample

`merge_sample.py` exercises the same timeline math against local media files.
