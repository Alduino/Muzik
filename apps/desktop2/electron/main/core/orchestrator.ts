import {log} from "../../../shared/logger.ts";
import {audioTrackBuffer} from "./AudioTrackBuffer.ts";
import {trackQueue} from "./TrackQueue.ts";
import {initialiseWorker} from "./worker.ts";

function attachBufferListeners() {
    function swapLoadedTrack(
        trackId: number | null,
        previousTrackId: number | null
    ) {
        if (previousTrackId) audioTrackBuffer.unloadTrack(previousTrackId);
        if (trackId) audioTrackBuffer.loadTrack(trackId);
    }

    log.debug("Attaching audio buffer listeners");
    trackQueue.currentTrack.onChange(swapLoadedTrack);
    trackQueue.lastTrack.onChange(swapLoadedTrack);
    trackQueue.nextTrack.onChange(swapLoadedTrack);
}

export async function startAudioPlaybackEngine() {
    log.info("Starting audio engine");

    attachBufferListeners();
    await initialiseWorker();
}
