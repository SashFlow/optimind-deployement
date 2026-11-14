#!/usr/bin/env python3
"""Merge agent/user audio + user video onto one timeline using egress starts.

Alignment:
  1. Take absolute egress start timestamps (nanoseconds) for each track.
  2. Earliest egress start → session t=0.
  3. Place each audio file at (its_egress_start - t0) on the shared canvas.
  4. Delay user video by the same relative offset, then mux with mixed audio.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

DIR = Path(__file__).resolve().parent
DEFAULT_AGENT = DIR / "case2/agent_audio.ogg"
DEFAULT_USER = DIR / "case2/user_audio.ogg"
DEFAULT_VIDEO = DIR / "case2/user_video.webm"
DEFAULT_OUT = DIR / "case2/merged_audio_egress.wav"
DEFAULT_VIDEO_OUT = DIR / "case2/merged_egress.mp4"
TARGET_SR = 48000

# Absolute egress start times from LiveKit Cloud dashboard (second precision, ns).
# Case 2 room SESSION_2026-11-14T00-48-31-151Z_4582 (project optimind / p_1ynt390zaht)
EGRESS_START_NS = {
    "user_audio": 1794617315000000000,  # 14 Nov 2026, 6:18:35 am IST
    "user_video": 1794617316000000000,  # 14 Nov 2026, 6:18:36 am IST
    "agent_audio": 1794617317000000000,  # 14 Nov 2026, 6:18:37 am IST
}


def load_mono(path: Path, target_sr: int = TARGET_SR) -> tuple[np.ndarray, int]:
    audio, sr = sf.read(str(path), always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    audio = audio.astype(np.float32, copy=False)
    if sr != target_sr:
        # Polyphase resample (same role as torchaudio.functional.resample).
        g = np.gcd(sr, target_sr)
        audio = resample_poly(audio, target_sr // g, sr // g).astype(np.float32)
        sr = target_sr
    return audio, sr


def media_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    data = json.loads(result.stdout)
    return float(data["format"]["duration"])


def place_at(
    canvas: np.ndarray,
    audio: np.ndarray,
    *,
    start_s: float,
    sr: int,
) -> None:
    """Copy audio onto canvas starting at start_s (seconds from session t0)."""
    dst_start = int(round(start_s * sr))
    if dst_start >= len(canvas):
        return
    src_start = 0
    if dst_start < 0:
        src_start = -dst_start
        dst_start = 0
    length = min(len(audio) - src_start, len(canvas) - dst_start)
    if length <= 0:
        return
    canvas[dst_start : dst_start + length] += audio[src_start : src_start + length]


def soft_clip(audio: np.ndarray, ceiling: float = 0.99) -> np.ndarray:
    peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
    if peak <= ceiling or peak == 0.0:
        return audio
    return audio * (ceiling / peak)


def mux_video(
    *,
    video: Path,
    audio: Path,
    out: Path,
    video_delay_s: float,
    span_s: float,
) -> None:
    """Pad video start to match egress offset, then mux with mixed audio."""
    # tpad adds black frames for delay; -t span_s matches the audio canvas.
    filter_v = f"tpad=start_duration={video_delay_s:.9f}:start_mode=add"
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video),
        "-i",
        str(audio),
        "-filter_complex",
        f"[0:v]{filter_v}[v]",
        "-map",
        "[v]",
        "-map",
        "1:a",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-t",
        f"{span_s:.6f}",
        "-movflags",
        "+faststart",
        str(out),
    ]
    print("Mux:", " ".join(cmd), file=sys.stderr)
    subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent", type=Path, default=DEFAULT_AGENT)
    parser.add_argument("--user", type=Path, default=DEFAULT_USER)
    parser.add_argument("--video", type=Path, default=DEFAULT_VIDEO)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--video-out", type=Path, default=DEFAULT_VIDEO_OUT)
    parser.add_argument(
        "--no-video",
        action="store_true",
        help="Skip video mux; write mixed audio only",
    )
    parser.add_argument(
        "--pad",
        type=float,
        default=0.5,
        help="Extra silence (seconds) after last sample of any track",
    )
    parser.add_argument(
        "--agent-egress-ns",
        type=int,
        default=EGRESS_START_NS["agent_audio"],
        help="Agent audio egress start (nanoseconds)",
    )
    parser.add_argument(
        "--user-egress-ns",
        type=int,
        default=EGRESS_START_NS["user_audio"],
        help="User audio egress start (nanoseconds)",
    )
    parser.add_argument(
        "--user-video-egress-ns",
        type=int,
        default=EGRESS_START_NS["user_video"],
        help="User video egress start (nanoseconds)",
    )
    args = parser.parse_args()

    t0_ns = min(args.agent_egress_ns, args.user_egress_ns, args.user_video_egress_ns)

    def rel_s(ns: int) -> float:
        return (ns - t0_ns) / 1e9

    agent_start = rel_s(args.agent_egress_ns)
    user_start = rel_s(args.user_egress_ns)
    video_start = rel_s(args.user_video_egress_ns)
    desync = agent_start - user_start

    print(f"Egress t0 (earliest): {t0_ns}")
    print(f"User  audio starts @ {user_start:+.6f}s")
    print(f"User  video starts @ {video_start:+.6f}s")
    print(f"Agent audio starts @ {agent_start:+.6f}s")
    print(f"Agent-user audio desync: {desync:+.6f}s")

    agent_audio, sr = load_mono(args.agent)
    user_audio, user_sr = load_mono(args.user)
    if user_sr != sr:
        raise SystemExit(f"Sample rate mismatch after resample: {sr} vs {user_sr}")

    agent_dur = len(agent_audio) / sr
    user_dur = len(user_audio) / sr
    video_dur = media_duration(args.video) if not args.no_video else 0.0

    ends = [agent_start + agent_dur, user_start + user_dur]
    if not args.no_video:
        ends.append(video_start + video_dur)
    span_s = max(ends) + args.pad
    n = int(round(span_s * sr))

    print(f"Agent duration: {agent_dur:.3f}s")
    print(f"User  duration: {user_dur:.3f}s")
    if not args.no_video:
        print(f"Video duration: {video_dur:.3f}s")
    print(f"Canvas span:    {span_s:.3f}s @ {sr} Hz")

    canvas = np.zeros(n, dtype=np.float32)
    place_at(canvas, agent_audio, start_s=agent_start, sr=sr)
    place_at(canvas, user_audio, start_s=user_start, sr=sr)

    merged = soft_clip(canvas)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(args.out), merged, sr)
    print(f"Wrote {args.out} ({len(merged) / sr:.3f}s @ {sr} Hz)")

    if not args.no_video:
        args.video_out.parent.mkdir(parents=True, exist_ok=True)
        mux_video(
            video=args.video,
            audio=args.out,
            out=args.video_out,
            video_delay_s=video_start,
            span_s=span_s,
        )
        print(f"Wrote {args.video_out}")


if __name__ == "__main__":
    main()
