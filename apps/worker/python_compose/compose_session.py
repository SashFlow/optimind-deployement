from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from livekit import api

from merge_audio_egress import (
    load_mono,
    media_duration,
    mux_video,
    place_at,
    soft_clip,
)

DIR = Path(__file__).resolve().parent
ROOT = DIR.parent
ROLES = ("user_audio", "user_video", "agent_audio")
ROLE_EXTS = {
    "user_audio": (".ogg", ".mp3", ".wav", ".oga"),
    "agent_audio": (".ogg", ".mp3", ".wav", ".oga"),
    "user_video": (".webm", ".mp4", ".mkv"),
}


@dataclass
class TrackEgress:
    role: str
    egress_id: str
    started_at_ns: int
    ended_at_ns: int | None
    filepath: str | None
    location: str | None
    file_started_at_ns: int | None

    @property
    def align_ns(self) -> int:
        # Prefer file media clock when LiveKit returns it; else egress job start.
        return self.file_started_at_ns or self.started_at_ns


def load_dotenv_files() -> None:
    """Load .env files. Repo-root .env overrides process env (source of truth)."""
    for path, overwrite in ((DIR / ".env", False), (ROOT / ".env", True)):
        if not path.is_file():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if overwrite or key not in os.environ:
                os.environ[key] = val


def livekit_creds(*, use_dev: bool) -> tuple[str, str, str]:
    if use_dev:
        url = os.environ.get("LIVEKIT_DEV_URL") or os.environ.get("LIVEKIT_URL")
        key = os.environ.get("LIVEKIT_DEV_API_KEY") or os.environ.get("LIVEKIT_API_KEY")
        secret = os.environ.get("LIVEKIT_DEV_API_SECRET") or os.environ.get(
            "LIVEKIT_API_SECRET"
        )
    else:
        url = os.environ.get("LIVEKIT_URL")
        key = os.environ.get("LIVEKIT_API_KEY")
        secret = os.environ.get("LIVEKIT_API_SECRET")
    if not url or not key or not secret:
        raise SystemExit(
            "Missing LiveKit credentials. Set LIVEKIT_URL / LIVEKIT_API_KEY / "
            "LIVEKIT_API_SECRET (or LIVEKIT_DEV_* with --dev) in env or .env"
        )
    return url, key, secret


def role_from_filepath(filepath: str | None) -> str | None:
    if not filepath:
        return None
    name = filepath.rstrip("/").rsplit("/", 1)[-1].lower()
    # Strip extension if present
    stem = re.sub(r"\.(ogg|mp3|wav|oga|webm|mp4|mkv)$", "", name)
    for role in ROLES:
        if stem == role or stem.startswith(role):
            return role
    return None


async def fetch_tracks(room_name: str, *, url: str, key: str, secret: str) -> list[TrackEgress]:
    async with api.LiveKitAPI(url, key, secret) as lk:
        response = await lk.egress.list_egress(api.ListEgressRequest(room_name=room_name))

    tracks: list[TrackEgress] = []
    for egress in response.items:
        kind = egress.WhichOneof("request")
        filepath = None
        if kind == "track" and egress.track and egress.track.file:
            filepath = egress.track.file.filepath

        role = role_from_filepath(filepath)
        if role is None:
            continue

        location = None
        file_started = None
        if egress.file_results:
            fr = egress.file_results[0]
            location = fr.location or None
            file_started = fr.started_at or None
        elif egress.WhichOneof("result") == "file" and egress.file:
            location = egress.file.location or None
            file_started = egress.file.started_at or None

        if not egress.started_at:
            continue

        tracks.append(
            TrackEgress(
                role=role,
                egress_id=egress.egress_id,
                started_at_ns=int(egress.started_at),
                ended_at_ns=int(egress.ended_at) if egress.ended_at else None,
                filepath=filepath,
                location=location,
                file_started_at_ns=int(file_started) if file_started else None,
            )
        )

    # Deduplicate by role (keep earliest align time)
    by_role: dict[str, TrackEgress] = {}
    for t in tracks:
        prev = by_role.get(t.role)
        if prev is None or t.align_ns < prev.align_ns:
            by_role[t.role] = t

    missing = [r for r in ROLES if r not in by_role]
    if missing:
        found = ", ".join(f"{t.role}={t.egress_id}" for t in by_role.values()) or "(none)"
        raise SystemExit(
            f"Room {room_name!r}: missing egress roles {missing}. Found: {found}"
        )
    return [by_role[r] for r in ROLES]


def find_local(media_dir: Path, role: str) -> Path | None:
    for ext in ROLE_EXTS[role]:
        candidate = media_dir / f"{role}{ext}"
        if candidate.is_file():
            return candidate
    # Also accept files that start with role name (e.g. user_audio(1).mp3)
    matches = sorted(
        p
        for p in media_dir.iterdir()
        if p.is_file() and p.stem.lower().startswith(role)
    )
    return matches[0] if matches else None


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {url} -> {dest}")
    urllib.request.urlretrieve(url, dest)
    return dest


def resolve_media(
    tracks: list[TrackEgress],
    *,
    media_dir: Path,
    download_dir: Path,
) -> dict[str, Path]:
    paths: dict[str, Path] = {}
    for t in tracks:
        local = find_local(media_dir, t.role)
        if local:
            paths[t.role] = local
            continue
        if t.location:
            # Infer extension from location / filepath
            src = t.location.split("?", 1)[0]
            ext = Path(src).suffix or (
                ".webm" if t.role == "user_video" else ".ogg"
            )
            dest = download_dir / f"{t.role}{ext}"
            try:
                paths[t.role] = download(t.location, dest)
                continue
            except Exception as e:
                print(f"Download failed for {t.role}: {e}")
        raise SystemExit(
            f"Missing media for {t.role}. Place {t.role}.* in {media_dir} "
            f"(or ensure egress file location is downloadable)."
        )
    return paths


def print_table(tracks: list[TrackEgress]) -> None:
    t0 = min(t.align_ns for t in tracks)
    print(f"\nAlignment t0: {datetime.fromtimestamp(t0 / 1e9, tz=timezone.utc).isoformat()}")
    print(f"{'role':12} {'rel_start':>10} {'@24fps':>8}  egress_id")
    for t in sorted(tracks, key=lambda x: x.align_ns):
        rel = (t.align_ns - t0) / 1e9
        print(f"{t.role:12} {rel:+10.6f}s {rel * 24:8.2f}  {t.egress_id}")


def merge(
    *,
    media: dict[str, Path],
    tracks: list[TrackEgress],
    out_wav: Path,
    out_mp4: Path,
    pad: float,
    no_video: bool,
) -> None:
    by_role = {t.role: t for t in tracks}
    t0 = min(t.align_ns for t in tracks)

    def rel(role: str) -> float:
        return (by_role[role].align_ns - t0) / 1e9

    agent_start = rel("agent_audio")
    user_start = rel("user_audio")
    video_start = rel("user_video")

    print(f"\nUser  audio @ {user_start:+.6f}s")
    print(f"User  video @ {video_start:+.6f}s")
    print(f"Agent audio @ {agent_start:+.6f}s")

    agent_audio, sr = load_mono(media["agent_audio"])
    user_audio, user_sr = load_mono(media["user_audio"])
    if user_sr != sr:
        raise SystemExit(f"Sample rate mismatch: {sr} vs {user_sr}")

    agent_dur = len(agent_audio) / sr
    user_dur = len(user_audio) / sr
    video_dur = media_duration(media["user_video"]) if not no_video else 0.0

    ends = [agent_start + agent_dur, user_start + user_dur]
    if not no_video:
        ends.append(video_start + video_dur)
    span_s = max(ends) + pad
    n = int(round(span_s * sr))

    canvas = np_zeros(n)
    place_at(canvas, agent_audio, start_s=agent_start, sr=sr)
    place_at(canvas, user_audio, start_s=user_start, sr=sr)
    merged = soft_clip(canvas)

    out_wav.parent.mkdir(parents=True, exist_ok=True)
    import soundfile as sf

    sf.write(str(out_wav), merged, sr)
    print(f"Wrote {out_wav} ({len(merged) / sr:.3f}s @ {sr} Hz)")

    if not no_video:
        out_mp4.parent.mkdir(parents=True, exist_ok=True)
        mux_video(
            video=media["user_video"],
            audio=out_wav,
            out=out_mp4,
            video_delay_s=video_start,
            span_s=span_s,
        )
        print(f"Wrote {out_mp4}")


def np_zeros(n: int):
    import numpy as np

    return np.zeros(n, dtype=np.float32)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("room", help="LiveKit room name (SESSION_...)")
    parser.add_argument(
        "--media-dir",
        type=Path,
        default=None,
        help="Directory containing agent_audio.*, user_audio.*, user_video.* "
        "(default: <out-dir>)",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="Output directory (default: out/<room>)",
    )
    parser.add_argument("--pad", type=float, default=0.5)
    parser.add_argument("--no-video", action="store_true")
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Use LIVEKIT_DEV_* credentials",
    )
    parser.add_argument(
        "--timestamps-only",
        action="store_true",
        help="Fetch and print timestamps; skip merge",
    )
    args = parser.parse_args()

    load_dotenv_files()
    url, key, secret = livekit_creds(use_dev=args.dev)

    out_dir = args.out_dir or (DIR / "out" / args.room)
    media_dir = args.media_dir or out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Room: {args.room}")
    print(f"LiveKit: {url}")
    tracks = asyncio.run(fetch_tracks(args.room, url=url, key=key, secret=secret))
    print_table(tracks)

    meta = {
        "room": args.room,
        "livekit_url": url,
        "tracks": [
            {
                **asdict(t),
                "align_ns": t.align_ns,
                "rel_start_s": (t.align_ns - min(x.align_ns for x in tracks)) / 1e9,
            }
            for t in tracks
        ],
    }
    meta_path = out_dir / "egress_timestamps.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Wrote {meta_path}")

    if args.timestamps_only:
        return

    media = resolve_media(tracks, media_dir=media_dir, download_dir=out_dir)
    print("\nMedia:")
    for role, path in media.items():
        print(f"  {role}: {path}")

    merge(
        media=media,
        tracks=tracks,
        out_wav=out_dir / "merged_audio_egress.wav",
        out_mp4=out_dir / "merged_egress.mp4",
        pad=args.pad,
        no_video=args.no_video,
    )


if __name__ == "__main__":
    main()
