import {observable} from "../../main/utils/Observable.ts";
import {childLogger} from "./log.ts";
import {TrackAudioBuffer} from "./track-audio-buffer.ts";
import {trackBufferRepository} from "./track-buffer-repository.ts";
import {trackQueue} from "./track-queue.ts";

const log = childLogger("audio-stream");

interface ReadResult {
    /**
     * A buffer containing the audio data,
     * as interleaved little-endian signed 32-bit integers.
     *
     * Can be less than `bytes` long, so it should be padded with zeroes.
     */
    buffer: Buffer;

    nextTrackStarted: boolean;
}

let currentTrack: TrackAudioBuffer | null = null;
let currentTrackFrameCount: number | null = null;

const currentTrackProgress = observable(0);

export const audioStream = {
    currentTrackProgress: currentTrackProgress.observable(),

    importTrackPacket(
        trackId: number,
        buffer: ArrayBuffer,
        startFrame: number
    ) {
        const buff = Buffer.from(buffer);

        if (trackId === currentTrack?.trackId) {
            currentTrack.importPacket(buff, startFrame);
        }

        trackBufferRepository.importTrackPacket(trackId, buff, startFrame);
    },

    read(bytes: number): ReadResult {
        if (currentTrack === null) {
            return {
                buffer: Buffer.alloc(0),
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
                    nextTrackData
                ]);

                return {
                    buffer: concatenated,
                    nextTrackStarted: true
                };
            } else {
                return {
                    buffer: currentTrackData,
                    nextTrackStarted: true
                };
            }
        } else {
            return {
                buffer: currentTrackData,
                nextTrackStarted: false
            };
        }
    },

    seek(progress: number) {
        if (currentTrackFrameCount) {
            currentTrack?.seek(progress * currentTrackFrameCount);
        } else {
            log.warn("Attempted to seek on track with unknown length");
        }
    }
};

function useTrackForProgress(loadedTrack: TrackAudioBuffer) {
    loadedTrack.currentFrame.onChange(frame => {
        currentTrackFrameCount = loadedTrack.frameCount ?? null;

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
        if (currentTrack?.trackId === trackId) return;

        if (trackId === null) {
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
