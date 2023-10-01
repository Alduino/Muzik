import {AudioTrackBufferItem} from "../../main/core/AudioTrackBuffer.ts";
import {rpc} from "./index.ts";

const trackBuffers = new Map<number, AudioTrackBufferItem>();

// Stores small buffers, a few seconds long, containing the start of some tracks.
export const audioTrackBuffer = {
    setBufferedTrack(trackId: number, bufferItem: AudioTrackBufferItem) {
        trackBuffers.set(trackId, bufferItem);
    },
    deleteBufferedTrack(trackId: number) {
        trackBuffers.delete(trackId);
    },
    async getTrack(trackId: number): Promise<AudioTrackBufferItem> {
        try {
            await rpc.loadTrack(trackId);

            const track = trackBuffers.get(trackId);

            if (!track) {
                throw new Error("Track is not loaded");
            }

            return track;
        } finally {
            await rpc.unloadTrack(trackId);
        }
    }
};
