import {log} from "../../../shared/logger.ts";
import {db} from "../db.ts";
import {findBestAudioSource} from "../utils/findBestAudioSource.ts";
import {trackQueue} from "./TrackQueue.ts";
import {TrackReadStream} from "./TrackReadStream.ts";
import {rpc} from "./worker.ts";

const trackReadStreams = new Map<number, TrackReadStream>();

async function readStreamHandler(
    newTrackId: number | null,
    oldTrackId: number | null
) {
    if (oldTrackId) {
        trackReadStreams.delete(oldTrackId);
    }

    if (newTrackId && !trackReadStreams.has(newTrackId)) {
        log.debug({trackId: newTrackId}, "Creating track read stream");

        const audioSourceId = await findBestAudioSource(newTrackId);

        const {path} = await db.selectFrom("AudioSource")
            .where("id", "=", audioSourceId)
            .select("path")
            .executeTakeFirstOrThrow();

        trackReadStreams.set(newTrackId, new TrackReadStream(path));
    }
}

export const readStreamManager = {
    async requestTrackPacket(trackId: number, frameIndex: number) {
        const readStream = trackReadStreams.get(trackId);
        if (!readStream) return;

        const packet = await readStream.requestPacket(frameIndex);
        if (!packet) return;

        rpc.importTrackPacket(trackId, packet.buffer, packet.startFrame);
    }
};

export function addTrackReadStreamListeners() {
    trackQueue.currentTrack.onChange(readStreamHandler);
}
