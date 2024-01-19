import {Readable} from "stream";
import FFT from "fft.js";
import Speaker from "speaker";
import {PLAYBACK_CHANNELS, PLAYBACK_SAMPLE_SIZE} from "../../main/constants.ts";
import {observable} from "../../main/utils/Observable.ts";
import {padBuffer} from "../../main/utils/padBuffer.ts";
import {audioStream} from "./audio-stream.ts";
import {rpc} from "./index.ts";
import {childLogger} from "./log.ts";
import {PLAYBACK_SAMPLE_RATE} from "../../../shared/audio/constants.ts";
import {FFT_SPEAKER_FRAMES, SPEAKER_FRAME_SIZE} from "../../constants/audio.ts";

const log = childLogger("audio-playback-engine");

const FREQUENCY_BIN_COUNT = SPEAKER_FRAME_SIZE * FFT_SPEAKER_FRAMES / 2;
const frequencyBins = observable(new Uint32Array(FREQUENCY_BIN_COUNT).fill(0));
export const frequencyBinsObservable = frequencyBins.observable();

const fftBufferSize = SPEAKER_FRAME_SIZE * FFT_SPEAKER_FRAMES * PLAYBACK_SAMPLE_SIZE * PLAYBACK_CHANNELS;
let fftBufferIndex = 0, fftBuffer: Buffer = Buffer.alloc(fftBufferSize);

class SpeakerDataReader extends Readable {
    _read(size: number) {
        const result = audioStream.read(size);

        if (result.nextTrackStarted) {
            log.debug("Next track has already started");

            setImmediate(() => {
                rpc.nextTrack();
            });
        }

        const buffer = padBuffer(result.buffer, size);

        if (fftBufferIndex === FFT_SPEAKER_FRAMES) {
            updateFft(fftBuffer);
            fftBufferIndex = 0;
        }

        buffer.copy(fftBuffer, fftBufferIndex * SPEAKER_FRAME_SIZE * PLAYBACK_SAMPLE_SIZE * PLAYBACK_CHANNELS);
        fftBufferIndex++;

        try {
            this.push(buffer);
        } catch (err) {
            log.warn(
                {err, size, result},
                "Failed to write audio data to speaker"
            );
        }
    }
}

function performFft(data: number[]) {
    // Data length must be `FREQUENCY_BIN_COUNT * 2`

    const fft = new FFT(FREQUENCY_BIN_COUNT * 2);
    const fftData = fft.createComplexArray();
    fft.realTransform(fftData, data);

    const output = new Array(FREQUENCY_BIN_COUNT);
    fft.fromComplexArray(fftData, output);

    return output;
}

function updateFft(buffer: Buffer) {
    const frameByteSize = PLAYBACK_SAMPLE_SIZE * PLAYBACK_CHANNELS;
    const frameCount = buffer.byteLength / frameByteSize;

    if (frameCount !== FREQUENCY_BIN_COUNT * 2) {
        log.warn({
            frameCount,
            fftSize: FREQUENCY_BIN_COUNT * 2
        }, "Audio buffer is not the right size for FFT which will cause artefacts");
    }

    const averagedFrequencyBins = new Uint32Array(FREQUENCY_BIN_COUNT).fill(0);

    for (let channel = 0; channel < PLAYBACK_CHANNELS; channel++) {
        const samples = new Array(FREQUENCY_BIN_COUNT * 2).fill(0);

        const maxSampleIdx = Math.min(frameCount, FREQUENCY_BIN_COUNT * 2);
        for (let sampleIdx = 0; sampleIdx < maxSampleIdx; sampleIdx++) {
            const byteOffset = sampleIdx * frameByteSize + channel * PLAYBACK_SAMPLE_SIZE;

            // currently hardcoded to s32le - see TrackReadStream.ts:122
            samples[sampleIdx] = buffer.readInt32LE(byteOffset);
        }

        const channelFreqBins = performFft(samples);

        for (let binIdx = 0; binIdx < FREQUENCY_BIN_COUNT; binIdx++) {
            const realValue = channelFreqBins[binIdx];
            const imaginaryValue = channelFreqBins[binIdx + 1];
            const magnitude = Math.sqrt(realValue * realValue + imaginaryValue * imaginaryValue);

            averagedFrequencyBins[binIdx] += magnitude / PLAYBACK_CHANNELS;
        }
    }

    frequencyBins.set(averagedFrequencyBins);
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
