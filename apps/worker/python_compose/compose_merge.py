#!/usr/bin/env python3
"""Headless egress-canvas merge for the Node worker.

Accepts local media paths + absolute align timestamps (ns). Writes mixed WAV
and optionally muxed MP4. Prints a JSON summary on stdout (last line).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

from merge_audio_egress import (
    load_mono,
    media_duration,
    mux_video,
    place_at,
    soft_clip,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent", type=Path, required=True)
    parser.add_argument("--user", type=Path, required=True)
    parser.add_argument("--video", type=Path, default=None)
    parser.add_argument("--agent-egress-ns", type=int, required=True)
    parser.add_argument("--user-egress-ns", type=int, required=True)
    parser.add_argument("--user-video-egress-ns", type=int, default=None)
    parser.add_argument("--out-wav", type=Path, required=True)
    parser.add_argument("--video-out", type=Path, default=None)
    parser.add_argument("--pad", type=float, default=0.5)
    parser.add_argument(
        "--no-video",
        action="store_true",
        help="Skip video mux; write mixed audio only",
    )
    args = parser.parse_args()

    for path, label in ((args.agent, "agent"), (args.user, "user")):
        if not path.is_file():
            raise SystemExit(f"Missing {label} audio: {path}")

    no_video = args.no_video or args.video is None
    if not no_video:
        if args.video is None or not args.video.is_file():
            raise SystemExit(f"Missing user video: {args.video}")
        if args.user_video_egress_ns is None:
            raise SystemExit("--user-video-egress-ns required when muxing video")
        if args.video_out is None:
            raise SystemExit("--video-out required when muxing video")

    align_ns = {
        "agent_audio": args.agent_egress_ns,
        "user_audio": args.user_egress_ns,
    }
    if not no_video:
        align_ns["user_video"] = args.user_video_egress_ns

    t0_ns = min(align_ns.values())

    def rel_s(ns: int) -> float:
        return (ns - t0_ns) / 1e9

    agent_start = rel_s(args.agent_egress_ns)
    user_start = rel_s(args.user_egress_ns)
    video_start = (
        rel_s(args.user_video_egress_ns) if not no_video else 0.0
    )

    agent_audio, sr = load_mono(args.agent)
    user_audio, user_sr = load_mono(args.user)
    if user_sr != sr:
        raise SystemExit(f"Sample rate mismatch after resample: {sr} vs {user_sr}")

    agent_dur = len(agent_audio) / sr
    user_dur = len(user_audio) / sr
    video_dur = media_duration(args.video) if not no_video else 0.0

    ends = [agent_start + agent_dur, user_start + user_dur]
    if not no_video:
        ends.append(video_start + video_dur)
    span_s = max(ends) + args.pad
    n = int(round(span_s * sr))

    canvas = np.zeros(n, dtype=np.float32)
    place_at(canvas, agent_audio, start_s=agent_start, sr=sr)
    place_at(canvas, user_audio, start_s=user_start, sr=sr)
    merged = soft_clip(canvas)

    args.out_wav.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(args.out_wav), merged, sr)

    video_out: str | None = None
    if not no_video:
        assert args.video is not None and args.video_out is not None
        args.video_out.parent.mkdir(parents=True, exist_ok=True)
        mux_video(
            video=args.video,
            audio=args.out_wav,
            out=args.video_out,
            video_delay_s=video_start,
            span_s=span_s,
        )
        video_out = str(args.video_out)

    summary = {
        "ok": True,
        "t0Ns": str(t0_ns),
        "sampleRate": sr,
        "spanS": span_s,
        "padS": args.pad,
        "outWav": str(args.out_wav),
        "videoOut": video_out,
        "trackOffsetsS": {
            "user_audio": user_start,
            "agent_audio": agent_start,
            **({"user_video": video_start} if not no_video else {}),
        },
        "durationsS": {
            "user_audio": user_dur,
            "agent_audio": agent_dur,
            **({"user_video": video_dur} if not no_video else {}),
        },
    }
    # Progress/logs from mux go to stderr via ffmpeg; summary is the last stdout line.
    print(json.dumps(summary), flush=True)


if __name__ == "__main__":
    try:
        main()
    except SystemExit as e:
        if e.code not in (0, None):
            print(
                json.dumps({"ok": False, "error": str(e)}),
                file=sys.stderr,
                flush=True,
            )
        raise
    except Exception as e:
        print(
            json.dumps({"ok": False, "error": str(e)}),
            file=sys.stderr,
            flush=True,
        )
        raise SystemExit(1) from e
