import {log} from "../../../shared/logger.ts";
import {PLAYBACK_SAMPLE_RATE} from "../../main/constants.ts";
import {rpc} from "./index.ts";
import {TrackAudioBuffer} from "./track-audio-buffer.ts";

// Track ID -> TrackAudioBuffer
const bufferedTracks = new Map<number, TrackAudioBuffer>();

export const trackBufferRepository = {
    importTrackPacket(trackId: number, buffer: Buffer, startFrame: number) {
        const bufferedTrack = bufferedTracks.get(trackId);
        if (!bufferedTrack) return;

        bufferedTrack.importPacket(buffer, startFrame);
    },

    /**
     * Gets the track and deletes it from the queue.
     */
    consumeTrack(id: number) {
        const track = bufferedTracks.get(id);
        log.trace({id, loaded: !!track}, "Consuming track");
        bufferedTracks.delete(id);
        return track ?? null;
    },

    /**
     * Loads and creates the track's `TrackAudioBuffer`.
     */
    async loadTrack(id: number) {
        log.trace({id}, "Preparing track");

        const track = await rpc.loadTrack(id);
        const frameCount = track.duration * PLAYBACK_SAMPLE_RATE;

        const trackAudioBuffer = new TrackAudioBuffer(id, frameCount);

        trackAudioBuffer.importPacket(Buffer.from(track.cache), 0, true);

        // TODO Later: Fix memory leak if the track is never consumed.
        bufferedTracks.set(id, trackAudioBuffer);
    },

    /**
     * Loads the track, then consumes it immediately.
     */
    async loadAndConsumeTrack(id: number) {
        const consumedTrack = this.consumeTrack(id);
        if (consumedTrack) return consumedTrack;

        await this.loadTrack(id);
        const track = this.consumeTrack(id);

        if (!track) {
            throw new Error("Track was not loaded");
        }

        return track;
    }
};
