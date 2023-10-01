import {randomUUID} from "crypto";
import {join} from "path";
import {Worker} from "worker_threads";
import {z} from "zod";
import {log} from "../../../../shared/logger.ts";
import {
    WAVEFORM_BINARY_VERSION,
    WAVEFORM_BUCKET_COUNT
} from "../../../constants/waveform-overview.ts";
import {prisma} from "../../prisma.ts";
import {observable, procedure} from "../../trpc.ts";
import {getAudioFrameCount} from "../../utils/ffmpeg-utils.ts";
import {ffargs, runFfmpeg} from "../../utils/ffmpeg.ts";
import {throttle} from "../../utils/throttle.ts";

async function getMetadata(trackId: number) {
    const {path} = await prisma.audioSource.findFirstOrThrow({
        where: {
            trackId
        },
        select: {
            path: true
        }
    });

    const {stdout: probeResultString} = await runFfmpeg(
        "probe",
        ffargs()
            .add("select_streams", "a:0")
            .add("show_entries", "stream=duration,sample_rate,channels")
            .add("show_format")
            .add("print_format", "json")
            .addRaw(path)
    );

    const probeResult = JSON.parse(probeResultString);

    const stream = probeResult.streams[0];
    if (!stream) throw new Error("No audio stream found");

    const channelCount: number = stream.channels;
    const frameCount = getAudioFrameCount(stream);

    return {channelCount, frameCount, path};
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

            const {trackId} = input;

            const sendInProgressUpdate = throttle((binary: ArrayBuffer) => {
                emit.next({
                    done: false,
                    data: Buffer.from(binary).toString("base64")
                });
            }, 300);

            (async () => {
                const existingData = await prisma.track.findUniqueOrThrow({
                    where: {
                        id: trackId
                    },
                    select: {
                        waveformBins: true
                    }
                });

                if (existingData.waveformBins) {
                    const version = existingData.waveformBins.readUInt16LE(0);
                    const binCount = existingData.waveformBins.readUInt16LE(2);

                    if (
                        version === WAVEFORM_BINARY_VERSION &&
                        binCount == WAVEFORM_BUCKET_COUNT
                    ) {
                        emit.next({
                            done: true,
                            data: existingData.waveformBins.toString("base64")
                        });
                        emit.complete();
                        return;
                    }
                }

                const {channelCount, frameCount, path} =
                    await getMetadata(trackId);

                const worker = new Worker(
                    join(__dirname, "./workers/waveform-overview.js"),
                    {
                        workerData: {
                            channelCount,
                            frameCount
                        }
                    }
                );

                const ffmpeg = runFfmpeg(
                    "mpeg",
                    ffargs().add("i", path).add("f", "u16le").addRaw("-"),
                    {
                        pipe: true
                    }
                );

                ffmpeg.stdout!.on("data", (data: Buffer) => {
                    const id = randomUUID();

                    worker.postMessage(
                        {
                            id,
                            buffer: data.buffer
                        },
                        [data.buffer]
                    );

                    function handleResponse(message: {
                        id: string;
                        buffer: ArrayBuffer;
                    }) {
                        if (message.id !== id) return;

                        worker.off("message", handleResponse);
                        sendInProgressUpdate(message.buffer);
                    }

                    worker.on("message", handleResponse);
                });

                await ffmpeg;

                const finalBinaryDataBuffer = await new Promise<Buffer>(
                    resolve => {
                        const id = randomUUID();

                        worker.postMessage({
                            id
                        });

                        worker.on("message", message => {
                            if (message.id !== id) return;
                            resolve(Buffer.from(message.buffer));
                        });
                    }
                );

                worker.terminate();

                emit.next({
                    done: true,
                    data: finalBinaryDataBuffer.toString("base64")
                });
                emit.complete();

                log.info(
                    {
                        trackId: input.trackId,
                        byteLength: finalBinaryDataBuffer.byteLength
                    },
                    "Writing waveform data to database"
                );

                await prisma.track.update({
                    where: {
                        id: input.trackId
                    },
                    data: {
                        waveformBins: finalBinaryDataBuffer
                    }
                });
            })();
        });
    });
