import {childLogger} from "../../../shared/logger.ts";
import {db} from "../db.ts";
import {findBestAudioSource} from "../utils/findBestAudioSource.ts";
import {trackQueue} from "./TrackQueue.ts";
import {TrackReadStream} from "./TrackReadStream.ts";
import {rpc} from "./worker.ts";

const log = childLogger("read-stream-manager");

interface ReadStreamItem {
    readStream: TrackReadStream;
    lastUsed: bigint;
}

const trackReadStreams = new Map<number, ReadStreamItem>();

setInterval(() => {
    log.debug("Closing track read streams that have not been used for 10 seconds");

    const now = process.hrtime.bigint();
    for (const [trackId, {lastUsed}] of trackReadStreams) {
        if (now - lastUsed > 10_000_000_000n) {
            log.trace({trackId}, "Closing unused track read stream");

            trackReadStreams.get(trackId)?.readStream.close();
            trackReadStreams.delete(trackId);
        }
    }
}, 5000);

async function readStreamHandler(
    newTrackId: number | null,
    oldTrackId: number | null
) {
    if (oldTrackId) {
        log.debug({oldTrackId}, "Closing previous track's read stream");

        trackReadStreams.get(oldTrackId)?.readStream.close();
        trackReadStreams.delete(oldTrackId);
    }

    if (newTrackId && !trackReadStreams.has(newTrackId)) {
        log.debug({trackId: newTrackId}, "Creating new track's read stream");

        const audioSourceId = await findBestAudioSource(newTrackId);

        const {path} = await db.selectFrom("AudioSource")
            .where("id", "=", audioSourceId)
            .select("path")
            .executeTakeFirstOrThrow();

        const readStream = new TrackReadStream(path);

        readStream.closeEvent.listenOnce(() => {
            trackReadStreams.delete(newTrackId);
        });

        trackReadStreams.set(newTrackId, {
            readStream: readStream,
            lastUsed: process.hrtime.bigint()
        });
    }
}

export const readStreamManager = {
    async requestTrackPacket(trackId: number, frameIndex: number) {
        const readStream = trackReadStreams.get(trackId);
        if (!readStream) return;

        readStream.lastUsed = process.hrtime.bigint();
        const packet = await readStream.readStream.requestPacket(frameIndex);

        if (!packet) {
            log.debug({trackId}, "Track read stream returned no packet, end of the track?");
            rpc.importTrackPacket(trackId, Buffer.alloc(0), frameIndex);
            return;
        }

        rpc.importTrackPacket(trackId, packet.buffer, packet.startFrame);
    }
};

export function addTrackReadStreamListeners() {
    trackQueue.currentTrack.onChange(readStreamHandler);
}
