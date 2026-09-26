import { TrackReference, useTrackVolume } from "@livekit/components-react";
import { VoiceOrb, type VoiceOrbState } from "@repo/ui/assistant-ui";

export default function SessionVoiceOrb({
    state,
    agentAudioTrack,
    localMicTrack,
}: {
    state: VoiceOrbState;
    agentAudioTrack?: TrackReference;
    localMicTrack?: TrackReference;
}) {
    const agentVolume = useTrackVolume(agentAudioTrack);
    const localVolume = useTrackVolume(localMicTrack);
    // Prefer agent speech; fall back to local mic while listening.
    const rawVolume =
        state === "speaking" ? agentVolume : Math.max(agentVolume, localVolume);
    const volume = Math.min(1, rawVolume * 2.75);

    return (
        <VoiceOrb
            state={state}
            volume={volume}
            variant="blue"
            className="size-52 sm:size-64"
        />
    );
}
