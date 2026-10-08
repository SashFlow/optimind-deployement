# Spatius local replay assets

Staged distill output for `/demo/spatius-replay`.

Layout:

```
spatius-replay/<avatarId>/<clip>/
  audio.wav
  frames/*.bin
  manifest.json
```

Stage from the voice worker:

```bash
cd voice/worker
uv run python -m tools.flame_distill stage-web \
  --run-dir data/flame_atlas/<avatarId>/runs/<runId>/expressive \
  --avatar-id <avatarId> \
  --clip expressive \
  --web-public ../optimind-deployement/apps/web/public
```

Audio/frame binaries are gitignored; commit only this README.
