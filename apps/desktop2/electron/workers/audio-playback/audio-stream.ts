import {log} from "../../../shared/logger.ts";
import {observable} from "../../main/utils/Observable.ts";
import {padBuffer} from "../../main/utils/padBuffer.ts";
import {TrackAudioBuffer} from "./track-audio-buffer.ts";
import {trackBufferRepository} from "./track-buffer-repository.ts";
import {trackQueue} from "./track-queue.ts";

interface ReadResult {
    /**
     * A buffer containing the audio data,
     * as interleaved little-endian signed 32-bit integers.
     */
    buffer: Buffer;

    nextTrackStarted: boolean;
}

let currentTrack: TrackAudioBuffer | null = null;

const currentTrackProgress = observable(0);

export const audioStream = {
    currentTrackProgress: currentTrackProgress.observable(),

    read(bytes: number): ReadResult {
        if (currentTrack === null) {
            return {
                buffer: Buffer.alloc(bytes),
                nextTrackStarted: false
            };
        }

        const currentTrackData: Buffer =
            currentTrack.read(bytes) ?? Buffer.alloc(0);

        if (currentTrack.done()) {
            const nextTrackId = trackQueue.nextTrack.get();

            const nextTrack = nextTrackId
                ? trackBufferRepository.consumeTrack(nextTrackId)
                : null;
            currentTrack = nextTrack;

            if (nextTrack) {
                const nextTrackData: Buffer =
                    nextTrack.read(bytes) ?? Buffer.alloc(0);

                const concatenated = Buffer.concat([
                    currentTrackData,
                    nextTrackData,
                    Buffer.alloc(
                        bytes - currentTrackData.length - nextTrackData.length
                    )
                ]);

                return {
                    buffer: concatenated,
                    nextTrackStarted: true
                };
            } else {
                return {
                    buffer: padBuffer(currentTrackData, bytes),
                    nextTrackStarted: true
                };
            }
        } else {
            return {
                buffer: padBuffer(currentTrackData, bytes),
                nextTrackStarted: false
            };
        }
    },

    seek(newFrame: number) {
        currentTrack?.seek(newFrame);
    }
};

function useTrackForProgress(loadedTrack: TrackAudioBuffer) {
    loadedTrack.currentFrame.onChange(frame => {
        if (loadedTrack.frameCount) {
            currentTrackProgress.set(frame / loadedTrack.frameCount);
        } else {
            // Progress bar + unknown track length = bad
        }
    });
}

export function connectToTrackQueue() {
    log.debug("Connecting audio stream to track queue");

    let currentTrackLoadId: number | null = null;

    trackQueue.currentTrack.onChange(async trackId => {
        if (trackId === null || currentTrack?.trackId === trackId) {
            currentTrack = null;
            return;
        }

        const loadedTrack = trackBufferRepository.consumeTrack(trackId);

        if (loadedTrack) {
            currentTrack = loadedTrack;
            useTrackForProgress(loadedTrack);
            return;
        }

        currentTrackLoadId = trackId;

        const track = await trackBufferRepository.loadAndConsumeTrack(trackId);

        if (currentTrackLoadId !== trackId) {
            return;
        }

        currentTrack = track;
        useTrackForProgress(track);
    });

    trackQueue.nextTrack.onChange(trackId => {
        if (!trackId) return;
        trackBufferRepository.loadTrack(trackId);
    });
}
