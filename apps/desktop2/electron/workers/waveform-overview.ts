import {parentPort, workerData} from "worker_threads";
import {
    u16leReader,
    WaveformBucketCalculator
} from "../../shared/waveform-buckets";
import {
    WAVEFORM_BINARY_VERSION,
    WAVEFORM_BUCKET_COUNT
} from "../constants/waveform-overview.ts";

const WAVEFORM_BINARY_HEADER_SIZE = 5;
const WAVEFORM_BINARY_SAMPLE_SIZE = 2;
const WAVEFORM_BINARY_SAMPLE_MAX = 2 ** (WAVEFORM_BINARY_SAMPLE_SIZE * 8) - 1;

function formatWaveformBinBinary(normalisedBuckets: number[][]): ArrayBuffer {
    const bucketCount = normalisedBuckets.length;
    const channelCount = normalisedBuckets[0].length;

    const bufferSize =
        bucketCount * channelCount * WAVEFORM_BINARY_SAMPLE_SIZE +
        WAVEFORM_BINARY_HEADER_SIZE;

    const buffer = new Uint8Array(bufferSize).buffer;
    const dataView = new DataView(buffer);

    dataView.setUint16(0, WAVEFORM_BINARY_VERSION, true);
    dataView.setUint16(2, bucketCount, true);
    dataView.setUint8(4, channelCount);

    let offset = WAVEFORM_BINARY_HEADER_SIZE;

    for (const frame of normalisedBuckets) {
        for (const sample of frame) {
            dataView.setUint16(
                offset,
                sample * WAVEFORM_BINARY_SAMPLE_MAX,
                true
            );

            offset += WAVEFORM_BINARY_SAMPLE_SIZE;
        }
    }

    return buffer;
}

if (!parentPort) throw new Error("No parent port");
if (typeof workerData.frameCount !== "number")
    throw new Error("No frame count");
if (typeof workerData.channelCount !== "number")
    throw new Error("No channel count");

const waveformBucketCalculator = new WaveformBucketCalculator({
    dataReader: u16leReader(),
    bucketCount: WAVEFORM_BUCKET_COUNT,
    frameCount: workerData.frameCount,
    channelCount: workerData.channelCount
});

interface Message {
    id: string;
    buffer?: ArrayBuffer;
}

parentPort.on("message", ({id, buffer}: Message) => {
    if (buffer) {
        const dataView = new DataView(buffer);
        waveformBucketCalculator.update(dataView);
    }

    const normalisedBuckets = waveformBucketCalculator.digest();
    const result = formatWaveformBinBinary(normalisedBuckets);

    parentPort!.postMessage(
        {
            id,
            buffer: result
        } satisfies Message,
        [result]
    );
});
