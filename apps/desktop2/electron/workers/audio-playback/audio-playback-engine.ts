import {Readable} from "stream";
import Speaker from "speaker";
import {
    PLAYBACK_CHANNELS,
    PLAYBACK_SAMPLE_RATE,
    PLAYBACK_SAMPLE_SIZE
} from "../../main/constants.ts";
import {padBuffer} from "../../main/utils/padBuffer.ts";
import {audioStream} from "./audio-stream.ts";
import {rpc} from "./index.ts";
import {childLogger} from "./log.ts";

const log = childLogger("audio-playback-engine");

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
let reader: SpeakerDataReader | undefined = undefined;

export function createSpeaker() {
    cleanupSpeaker();

    log.debug("Creating new speaker");

    try {
        speaker = new Speaker({
            channels: PLAYBACK_CHANNELS,
            sampleRate: PLAYBACK_SAMPLE_RATE,
            bitDepth: PLAYBACK_SAMPLE_SIZE * 8
        });

        reader = new SpeakerDataReader();

        log.trace("Speaker has been created, beginning playback");

        reader.pipe(speaker);

        log.trace("Playback has begun");
    } catch (err) {
        log.fatal(err, "Failed to create speaker");
        throw err;
    }
}

export async function cleanupSpeaker() {
    if (reader) {
        log.debug("Closing speaker reader");

        reader.destroy();
        reader = undefined;
    }

    if (speaker) {
        log.debug("Closing speaker");

        speaker.close(true);
        speaker = undefined;
    }
}
