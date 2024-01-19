import {log} from "../../../shared/logger.ts";
import {
    PLAYBACK_CHANNELS,
    TRACK_CACHED_FRAMES
} from "../constants.ts";
import {db} from "../db.ts";
import {ffargs, runFfmpeg} from "../utils/ffmpeg.ts";
import {findBestAudioSource} from "../utils/findBestAudioSource.ts";
import {readStreamToBuffer} from "../utils/readStreamToBuffer.ts";
import {PLAYBACK_SAMPLE_RATE} from "../../../shared/audio/constants.ts";

export interface TrackInfo {
    /**
     * Duration of the track, in seconds.
     */
    duration: number;

    /**
     * Buffer of the track's first few seconds.
     */
    cache: ArrayBuffer;
}

async function getTrackCache(path: string) {
    const ffmpeg = runFfmpeg(
        "mpeg",
        ffargs()
            .add("t", (TRACK_CACHED_FRAMES / PLAYBACK_SAMPLE_RATE).toString())
            .add("i", path)
            .add("f", "s32le")
            .add("ar", PLAYBACK_SAMPLE_RATE.toString())
            .add("ac", PLAYBACK_CHANNELS.toString())
            .addRaw("-"),
        {pipe: true}
    );

    return await readStreamToBuffer(ffmpeg.stdout!);
}

export async function loadTrack(id: number): Promise<TrackInfo> {
    log.debug({trackId: id}, "Loading track data and cache");

    const audioSourceId = await findBestAudioSource(id);

    const audioSource = await db.selectFrom("AudioSource")
        .where("id", "=", audioSourceId)
        .select(["path", "duration"])
        .executeTakeFirstOrThrow();

    const buffer = await getTrackCache(audioSource.path);

    return {
        duration: audioSource.duration,
        cache: buffer
    };
}
