import {z} from "zod";
import {prisma} from "../../prisma.ts";
import {procedure} from "../../trpc.ts";
import {getAudioFrameCount} from "../../utils/ffmpeg-utils.ts";
import {ffargs, runFfmpeg} from "../../utils/ffmpeg.ts";
import {log} from "../../utils/logger.ts";

const WAVEFORM_BIN_COUNT = 3840;
const SAMPLE_BYTES = 2;
const SAMPLE_MAX = 2 ** (SAMPLE_BYTES * 8) - 1;

// Version 3: RMS, scale min to zero
const WAVEFORM_BIN_VERSION = 3;

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

export const getWaveformOverview = procedure
    .input(
        z.object({
            trackId: z.number().int().positive()
        })
    )
    .query(async ({input}) => {
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
                return existingData.waveformBins.toString("base64");
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
        const framesPerBin = Math.floor(frameCount / WAVEFORM_BIN_COUNT);

        const result = runFfmpeg(
            "mpeg",
            ffargs().add("i", path).add("f", "u16le").addRaw("-"),
            {
                pipe: true
            }
        );

        interface BinData {
            channelValues: number[];
            frameCount: number;
        }

        function createBin(): BinData {
            return {
                channelValues: new Array(channelCount).fill(0),
                frameCount: 0
            };
        }

        let currentBin: BinData = createBin();
        const bins: BinData[] = [];
        let readSamples = 0;

        result.stdout!.on("data", (data: Buffer) => {
            for (let offset = 0; offset < data.length; offset += SAMPLE_BYTES) {
                const currentSample = readSamples + offset / SAMPLE_BYTES;
                const currentFrame = Math.floor(currentSample / channelCount);
                const indexInBin = currentFrame % framesPerBin;
                const channel = currentSample % channelCount;

                if (
                    channel === 0 &&
                    indexInBin === 0 &&
                    bins.length < WAVEFORM_BIN_COUNT
                ) {
                    currentBin = createBin();
                    bins.push(currentBin);
                }

                const sample = data.readUInt16LE(offset) / SAMPLE_MAX;

                // Squared to use RMS
                currentBin.channelValues[channel] += sample * sample;

                if (channel === 0) currentBin.frameCount++;
            }

            readSamples += data.length / SAMPLE_BYTES;

            log.trace(
                {bytes: data.length},
                "Read %d frames out of %d",
                Math.floor(readSamples / channelCount),
                frameCount
            );
        });

        await result;

        // Array of bins, each bin has an array of channel values
        const valueBins = bins.map(bin => {
            return bin.channelValues.map(channelSum =>
                Math.sqrt(channelSum / bin.frameCount)
            );
        });

        const channelMinMaxValues = Array.from(
            {length: channelCount},
            (_, channelId) => {
                let min = Infinity;
                let max = 0;

                for (const bin of valueBins) {
                    const value = bin[channelId];
                    if (value < min) min = value;
                    if (value > max) max = value;
                }

                return {min, max};
            }
        );

        const scaledBins = valueBins.map(bin => {
            return bin.map((channelValue, channelId) => {
                const {min, max} = channelMinMaxValues[channelId];
                return (channelValue - min) / (max - min);
            });
        });

        const formatted = formatWaveformBinBinary(scaledBins);

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
    });
