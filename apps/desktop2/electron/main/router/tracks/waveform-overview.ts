import {z} from "zod";
import {
    u16leReader,
    WaveformBucketCalculator
} from "../../../shared/waveform-buckets";
import {prisma} from "../../prisma.ts";
import {observable, procedure} from "../../trpc.ts";
import {getAudioFrameCount} from "../../utils/ffmpeg-utils.ts";
import {ffargs, runFfmpeg} from "../../utils/ffmpeg.ts";
import {log} from "../../utils/logger.ts";
import {throttle} from "../../utils/throttle.ts";

const WAVEFORM_BIN_COUNT = 3840;

const WAVEFORM_BIN_VERSION = 1;

const WAVEFORM_BIN_BINARY_HEADER_SIZE = 5;
const WAVEFORM_BIN_BINARY_SAMPLE_SIZE = 2;
const WAVEFORM_BIN_BINARY_SAMPLE_MAX =
    2 ** (WAVEFORM_BIN_BINARY_SAMPLE_SIZE * 8) - 1;

function formatWaveformBinBinary(scaledBins: number[][]): Buffer {
    const frameCount = scaledBins.length;
    const channelCount = scaledBins[0].length;

    const bufferSize =
        frameCount * channelCount * WAVEFORM_BIN_BINARY_SAMPLE_SIZE +
        WAVEFORM_BIN_BINARY_HEADER_SIZE;
    const buffer = Buffer.alloc(bufferSize);

    buffer.writeUInt16LE(WAVEFORM_BIN_VERSION, 0);
    buffer.writeUInt16LE(WAVEFORM_BIN_COUNT, 2);
    buffer.writeUInt8(channelCount, 4);

    let offset = WAVEFORM_BIN_BINARY_HEADER_SIZE;

    for (const frame of scaledBins) {
        for (const sample of frame) {
            buffer.writeUInt16LE(
                sample * WAVEFORM_BIN_BINARY_SAMPLE_MAX,
                offset
            );

            offset += WAVEFORM_BIN_BINARY_SAMPLE_SIZE;
        }
    }

    return buffer;
}

interface Response {
    done: boolean;
    data: string;
}

export const getWaveformOverview = procedure
    .input(
        z.object({
            trackId: z.number().int().positive().optional()
        })
    )
    .subscription(async ({input}) => {
        return observable.observable<Response>(emit => {
            if (!input.trackId) {
                emit.complete();
                return;
            }

            const sendUpdate = throttle(
                (calculator: WaveformBucketCalculator) => {
                    const binary = formatWaveformBinBinary(
                        calculator.getNormalisedBuckets()
                    );

                    emit.next({
                        done: false,
                        data: binary.toString("base64")
                    });
                },
                300
            );

            (async () => {
                const existingData = await prisma.track.findUniqueOrThrow({
                    where: {
                        id: input.trackId
                    },
                    select: {
                        waveformBins: true
                    }
                });

                if (existingData.waveformBins) {
                    const version = existingData.waveformBins.readUInt16LE(0);
                    const binCount = existingData.waveformBins.readUInt16LE(2);

                    if (
                        version === WAVEFORM_BIN_VERSION &&
                        binCount == WAVEFORM_BIN_COUNT
                    ) {
                        emit.next({
                            done: true,
                            data: existingData.waveformBins.toString("base64")
                        });
                        emit.complete();
                        return;
                    }
                }

                const {path} = await prisma.audioSource.findFirstOrThrow({
                    where: {
                        trackId: input.trackId
                    },
                    select: {
                        path: true
                    }
                });

                const {stdout: probeResultString} = await runFfmpeg(
                    "probe",
                    ffargs()
                        .add("select_streams", "a:0")
                        .add(
                            "show_entries",
                            "stream=duration,sample_rate,channels"
                        )
                        .add("show_format")
                        .add("print_format", "json")
                        .addRaw(path)
                );

                const probeResult = JSON.parse(probeResultString);

                const stream = probeResult.streams[0];
                if (!stream) throw new Error("No audio stream found");

                const channelCount: number = stream.channels;
                const frameCount = getAudioFrameCount(stream);

                const result = runFfmpeg(
                    "mpeg",
                    ffargs().add("i", path).add("f", "u16le").addRaw("-"),
                    {
                        pipe: true
                    }
                );

                const waveformBucketCalculator = new WaveformBucketCalculator({
                    dataReader: u16leReader(),
                    bucketCount: WAVEFORM_BIN_COUNT,
                    frameCount,
                    channelCount
                });

                result.stdout!.on("data", (data: Buffer) => {
                    const dataView = new DataView(data.buffer);
                    waveformBucketCalculator.read(dataView);

                    sendUpdate(waveformBucketCalculator);
                });

                await result;

                const normalisedBuckets =
                    waveformBucketCalculator.getNormalisedBuckets();

                const formatted = formatWaveformBinBinary(normalisedBuckets);

                emit.next({
                    done: true,
                    data: formatted.toString("base64")
                });
                emit.complete();

                log.info(
                    {trackId: input.trackId, byteLength: formatted.byteLength},
                    "Writing waveform data to database"
                );

                await prisma.track.update({
                    where: {
                        id: input.trackId
                    },
                    data: {
                        waveformBins: formatted
                    }
                });

                return formatted.toString("base64");
            })();
        });
    });
