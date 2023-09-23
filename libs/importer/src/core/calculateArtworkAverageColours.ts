import {PrismaPromise} from "@muzik/db";
import Piscina from "piscina";
import {log} from "../logger";
import {PipelinedQueue} from "../utils/PipelinedQueue";
import {getContext} from "../utils/context";
import {
    getAverageColour,
    prepareAverageColourData
} from "../utils/getAverageColour";
import {getImageBuffer} from "../utils/getImageBuffer";

interface Rgb {
    r: number;
    g: number;
    b: number;
}

function rgbToHex({r, g, b}: Rgb) {
    return (
        "#" + ((r << 16) + (g << 8) + (b << 0)).toString(16).padStart(6, "0")
    );
}

function hexToRgb(hex: string): Rgb {
    const bigint = parseInt(hex.slice(1), 16);

    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

export interface CalculateArtworkAverageColoursOptions {
    averageColourWorkerPool: Piscina;
}

export async function calculateArtworkAverageColours({
    averageColourWorkerPool
}: CalculateArtworkAverageColoursOptions) {
    const {db} = getContext();

    const artwork = await db.artwork.findMany({
        select: {
            id: true,
            sources: {
                select: {
                    path: true,
                    embeddedIn: {
                        select: {
                            id: true
                        }
                    }
                }
            }
        }
    });

    type ArtworkItem = (typeof artwork)[number];
    type ArtworkSourceItem = ArtworkItem["sources"][number];

    interface QueueContext {
        buffer: ArrayBuffer;
        prepareDurationMs: number;
    }

    interface QueueOutput {
        rgb: Rgb;
        prepareDurationMs: number;
        processDurationMs: number;
    }

    const transactionQueries: PrismaPromise<unknown>[] = [];

    const queue = new PipelinedQueue<
        ArtworkSourceItem,
        QueueContext,
        QueueOutput
    >(
        {
            async prepare(source) {
                const startTime = process.hrtime.bigint();
                const sourceBuffer = await getImageBuffer(
                    source.path,
                    source.embeddedIn != null
                );

                const data = await prepareAverageColourData(sourceBuffer, {});

                return {
                    buffer: data,
                    prepareDurationMs:
                        Number(process.hrtime.bigint() - startTime) / 1e6
                };
            },
            async process(_, context) {
                const [{hex}, duration] = await getAverageColour(
                    context.buffer,
                    averageColourWorkerPool,
                    {}
                );

                const rgb = hexToRgb(hex);

                return {
                    rgb,
                    prepareDurationMs: context.prepareDurationMs,
                    processDurationMs: duration
                };
            }
        },
        {
            processConcurrency: averageColourWorkerPool.maxThreads
        }
    );

    await Promise.all(
        artwork.map(async artwork => {
            const avgColours = await queue.runAll(artwork.sources);

            const totalPrepareDurationMs = avgColours.reduce(
                (acc, {prepareDurationMs}) => acc + prepareDurationMs,
                0
            );

            const totalProcessDurationMs = avgColours.reduce(
                (acc, {processDurationMs}) => acc + processDurationMs,
                0
            );

            const colourSum = avgColours
                .map(c => c.rgb)
                .reduce(
                    (acc, {r, g, b}) => {
                        acc.r += r;
                        acc.g += g;
                        acc.b += b;
                        return acc;
                    },
                    {r: 0, g: 0, b: 0}
                );

            const colourAvg = {
                r: colourSum.r / avgColours.length,
                g: colourSum.g / avgColours.length,
                b: colourSum.b / avgColours.length
            };

            const avgColour = rgbToHex(colourAvg);

            log.trace(
                {
                    artwork: artwork.id,
                    avgColour,
                    sourceCount: avgColours.length,
                    totalPrepareDurationMs,
                    totalProcessDurationMs
                },
                "Calculated average colour"
            );

            transactionQueries.push(
                db.artwork.update({
                    where: {
                        id: artwork.id
                    },
                    data: {
                        avgColour
                    }
                })
            );
        })
    );

    await db.$transaction(transactionQueries);
}