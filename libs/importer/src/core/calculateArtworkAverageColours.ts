import Piscina from "piscina";
import {log} from "../logger";
import {PipelinedQueue} from "../utils/PipelinedQueue";
import {getContext} from "../utils/context";
import {getAverageColour} from "../utils/getAverageColour";
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

    const artworkUngrouped = await db.selectFrom("Artwork")
        .leftJoin("ImageSource", "ImageSource.artworkId", "Artwork.id")
        .leftJoin("AudioSource", "AudioSource.embeddedImageSourceId", "ImageSource.id")
        .select(["Artwork.id", "ImageSource.path", "AudioSource.id as embeddedInId"])
        .execute();

    const artwork = Array.from(artworkUngrouped.reduce((acc, row) => {
        const artwork = acc.get(row.id);

        if (artwork == null) {
            acc.set(row.id, {
                id: row.id,
                sources: []
            });
        } else {
            artwork.sources.push({
                path: row.path!,
                embedded: row.embeddedInId !== null
            });
        }

        return acc;
    }, new Map<number, {id: number; sources: {path: string; embedded: boolean}[]}>()).values());

    type ArtworkItem = (typeof artwork)[number];
    type ArtworkSourceItem = ArtworkItem["sources"][number];

    interface QueueContext {
        buffer: ArrayBuffer;
        mime: string;
        prepareDurationMs: number;
    }

    interface QueueOutput {
        rgb: Rgb;
        prepareDurationMs: number;
        processDurationMs: number;
    }

    const queue = new PipelinedQueue<
        ArtworkSourceItem,
        QueueContext,
        QueueOutput
    >(
        {
            async prepare(source) {
                const startTime = process.hrtime.bigint();
                const {buffer, mime} = await getImageBuffer(
                    source.path,
                    source.embedded
                );

                return {
                    buffer: buffer.buffer,
                    mime,
                    prepareDurationMs:
                        Number(process.hrtime.bigint() - startTime) / 1e6
                };
            },
            async process(_, context) {
                const [{hex}, duration] = await getAverageColour(
                    context.buffer,
                    context.mime,
                    averageColourWorkerPool
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

    await db.transaction().execute(async trx => {
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

                await trx.updateTable("Artwork")
                    .where("id", "=", artwork.id)
                    .set("avgColour", avgColour)
                    .execute();
            })
        );
    });
}
