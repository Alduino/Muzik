import {log} from "../../../shared/logger.ts";
import {prisma} from "../prisma.ts";
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
        trackReadStreams.get(oldTrackId)?.close();
        trackReadStreams.delete(oldTrackId);
    }

    if (newTrackId && !trackReadStreams.has(newTrackId)) {
        log.debug({trackId: newTrackId}, "Creating track read stream");

        const audioSourceId = await findBestAudioSource(newTrackId);

        const {path} = await prisma.audioSource.findUniqueOrThrow({
            where: {
                id: audioSourceId
            },
            select: {
                path: true
            }
        });

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
