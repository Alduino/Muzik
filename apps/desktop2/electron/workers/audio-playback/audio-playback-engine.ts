import {Readable} from "stream";
import Speaker from "speaker";
import {log} from "../../../shared/logger.ts";
import {
    PLAYBACK_CHANNELS,
    PLAYBACK_SAMPLE_RATE,
    PLAYBACK_SAMPLE_SIZE
} from "../../main/constants.ts";
import {padBuffer} from "../../main/utils/padBuffer.ts";
import {audioStream} from "./audio-stream.ts";
import {rpc} from "./index.ts";

class SpeakerDataReader extends Readable {
    _read(size: number) {
        const result = audioStream.read(size);

        if (result.nextTrackStarted) {
            rpc.nextTrack();
        }

        try {
            this.push(padBuffer(result.buffer, size));
        } catch (err) {
            log.warn(
                {err, size, result},
                "Failed to write audio data to speaker"
            );
        }
    }
}

let speaker: Speaker | undefined = undefined;

export function createSpeaker() {
    cleanupSpeaker();

    log.debug("Creating new speaker");

    try {
        speaker = new Speaker({
            channels: PLAYBACK_CHANNELS,
            sampleRate: PLAYBACK_SAMPLE_RATE,
            bitDepth: PLAYBACK_SAMPLE_SIZE * 8
        });

        const reader = new SpeakerDataReader();

        log.trace("Speaker has been created, beginning playback");

        reader.pipe(speaker);

        log.trace("Playback has begun");
    } catch (err) {
        log.fatal(err, "Failed to create speaker");
        throw err;
    }
}

export function cleanupSpeaker() {
    if (!speaker) return;

    log.debug("Closing speaker");

    speaker.end();
    speaker = undefined;
}
