import {prisma} from "../prisma.ts";
import {ffargs, runFfmpeg} from "../utils/ffmpeg.ts";
import {findBestAudioSource} from "../utils/findBestAudioSource.ts";
import {readStreamToBuffer} from "../utils/readStreamToBuffer.ts";
import {rpc} from "./worker.ts";

const BUFFER_SIZE_SECONDS = 3;

export interface AudioTrackBufferItem {
    /**
     * Buffer of the track's first few seconds.
     */
    readonly buffer: ArrayBuffer;

    /**
     * Path to the track.
     */
    readonly path: string;

    /**
     * Duration of the track, in seconds.
     */
    readonly duration: number;
}

// Allows quick access to the first few seconds of a track,
// e.g. to allow for instantly going to the previous or next track.
export class AudioTrackBuffer {
    #trackReferenceCounts = new Map<number, number>();
    #loadingTracks = new Set<number>();
    #bufferedTracks = new Set<number>();

    async #loadTrack(trackId: number): Promise<void> {
        const audioSourceId = await findBestAudioSource(trackId);

        const audioSource = await prisma.audioSource.findUniqueOrThrow({
            where: {
                id: audioSourceId
            },
            select: {
                path: true,
                duration: true
            }
        });

        const ffmpeg = runFfmpeg(
            "mpeg",
            ffargs()
                .add("t", BUFFER_SIZE_SECONDS.toString())
                .add("i", audioSource.path)
                .add("f", "f32le")
                .addRaw("-"),
            {pipe: true}
        );

        const buffer = await readStreamToBuffer(ffmpeg.stdout!);

        const bufferItem: AudioTrackBufferItem = {
            buffer: buffer.buffer,
            path: audioSource.path,
            duration: audioSource.duration
        };

        await rpc
            .withOptions({
                transferList: [bufferItem.buffer]
            })
            .setBufferedTrack(trackId, bufferItem);
    }

    #loadTrackWrapper(trackId: number) {
        if (this.#loadingTracks.has(trackId)) return Promise.resolve();
        if (this.#bufferedTracks.has(trackId)) return Promise.resolve();

        this.#loadingTracks.add(trackId);

        return this.#loadTrack(trackId)
            .then(() => {
                // Track load got cancelled.
                if (!this.#loadingTracks.has(trackId)) return;

                this.#bufferedTracks.add(trackId);
            })
            .finally(() => {
                this.#loadingTracks.delete(trackId);
            });
    }

    /**
     * Buffers a track for quick access later.
     *
     * When `canThrow` is false, this method never throws.
     * Instead, it flags the error to be thrown in `getTrack`.
     *
     * When `canThrow` is true, this method throws if the track fails to load.
     *
     * You **MUST** call `unloadTrack` when you're done with the track (in a `finally`).
     * Otherwise, there will be a severe memory leak.
     */
    async loadTrack(trackId: number, canThrow = false) {
        const currentCount = this.#trackReferenceCounts.get(trackId) ?? 0;
        this.#trackReferenceCounts.set(trackId, currentCount + 1);

        try {
            await this.#loadTrackWrapper(trackId);
        } catch (err) {
            if (canThrow) throw err;
        }
    }

    /**
     * Decrements the reference count of a track, that is incremented by `loadTrack`.
     * If the reference count reaches zero, the track is unloaded.
     */
    async unloadTrack(trackId: number) {
        this.#loadingTracks.delete(trackId);
        this.#bufferedTracks.delete(trackId);

        await rpc.deleteBufferedTrack(trackId);
    }
}

export const audioTrackBuffer = new AudioTrackBuffer();
