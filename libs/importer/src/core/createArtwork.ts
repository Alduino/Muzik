import {PrismaPromise} from "@muzik/db";
import Piscina from "piscina";
import {log} from "../logger";
import {PipelinedQueue} from "../utils/PipelinedQueue";
import {getContext} from "../utils/context";
import {getImageBuffer} from "../utils/getImageBuffer";

export interface CreateArtworkOptions {
    fingerprintWorkerPool: Piscina;
}

export async function createArtwork(
    imageSourceIdToAudioSourceId: ReadonlyMap<number, number>,
    {fingerprintWorkerPool}: CreateArtworkOptions
) {
    const {db} = getContext();

    const imageSourcesById = await db.imageSource
        .findMany({
            where: {
                id: {
                    in: Array.from(imageSourceIdToAudioSourceId.keys())
                }
            },
            select: {
                id: true,
                path: true,
                embeddedIn: {
                    select: {
                        id: true
                    }
                }
            }
        })
        .then(
            res =>
                new Map(res.map(imageSource => [imageSource.id, imageSource]))
        );

    const transactionQueries: PrismaPromise<unknown>[] = [];

    interface QueueInput {
        path: string;
        embedded: boolean;
    }

    interface QueueContext {
        buffer: Buffer;
        mime: string;
        loadDurationMs: number;
    }

    interface QueueOutput {
        fingerprint: string;
        loadDurationMs: number;
        calcDurationMs: number;
    }

    const queue = new PipelinedQueue<QueueInput, QueueContext, QueueOutput>(
        {
            async prepare({path, embedded}) {
                const startTime = process.hrtime.bigint();
                const {buffer, mime} = await getImageBuffer(path, embedded);
                const endTime = process.hrtime.bigint();

                return {
                    buffer,
                    mime,
                    loadDurationMs: Number(endTime - startTime) / 1e6
                };
            },
            async process(_, context) {
                const arrayBuffer = context.buffer.buffer;

                const [fingerprint, calcMs] = await fingerprintWorkerPool.run(
                    {
                        arrayBuffer,
                        mimeType: context.mime
                    },
                    {
                        transferList: [arrayBuffer]
                    }
                );

                return {
                    fingerprint,
                    loadDurationMs: context.loadDurationMs,
                    calcDurationMs: calcMs
                };
            }
        },
        {
            processConcurrency: fingerprintWorkerPool.maxThreads
        }
    );

    await Promise.all(
        Array.from(imageSourceIdToAudioSourceId.keys()).map(
            async imageSourceId => {
                const {path: imageSourcePath, embeddedIn} =
                    imageSourcesById.get(imageSourceId)!;

                const fingerprintResult = await queue
                    .run({
                        path: imageSourcePath,
                        embedded: embeddedIn != null
                    })
                    .catch(err =>
                        err instanceof Error ? err : new Error(err)
                    );

                if (fingerprintResult instanceof Error) {
                    log.warn(
                        {
                            imageSourcePath,
                            embedded: embeddedIn !== null,
                            error: fingerprintResult
                        },
                        "Failed to calculate fingerprint for image source, skipping"
                    );
                    return;
                }

                const {fingerprint, loadDurationMs, calcDurationMs} =
                    fingerprintResult;

                log.trace(
                    {
                        fingerprint,
                        loadDurationMs,
                        calcDurationMs,
                        imageSourcePath
                    },
                    "Calculated fingerprint for image source"
                );

                transactionQueries.push(
                    db.imageSource.update({
                        where: {
                            id: imageSourceId
                        },
                        data: {
                            artwork: {
                                connectOrCreate: {
                                    where: {
                                        fingerprint
                                    },
                                    create: {
                                        fingerprint,
                                        // Average colour is added later
                                        avgColour: "#000"
                                    }
                                }
                            }
                        }
                    })
                );
            }
        )
    );

    log.trace(
        {queryCount: transactionQueries.length},
        "Committing transaction to create and link artwork to image sources"
    );

    await db.$transaction(transactionQueries);
    transactionQueries.length = 0;

    // Track ID -> Artwork IDs
    const trackUsedArtworkIds = new Map<number, number[]>();

    for (const [imageSourceId, audioSourceId] of imageSourceIdToAudioSourceId) {
        const artwork = await db.imageSource
            .findUniqueOrThrow({
                where: {
                    id: imageSourceId
                }
            })
            .artwork({
                select: {
                    id: true
                }
            });

        if (!artwork) continue;

        const track = await db.audioSource
            .findUniqueOrThrow({
                where: {
                    id: audioSourceId
                }
            })
            .track({
                select: {
                    id: true
                }
            });

        if (!track) continue;

        trackUsedArtworkIds.set(track.id, [
            ...(trackUsedArtworkIds.get(track.id) ?? []),
            artwork.id
        ]);

        transactionQueries.push(
            db.track.update({
                where: {
                    id: track.id
                },
                data: {
                    artworks: {
                        connect: {
                            id: artwork.id
                        }
                    }
                }
            })
        );
    }

    for (const [trackId, usedArtworkIds] of trackUsedArtworkIds) {
        const artworkToDisconnect = await db.artwork.findMany({
            where: {
                tracks: {
                    some: {
                        id: trackId
                    }
                },
                id: {
                    notIn: usedArtworkIds
                }
            },
            select: {
                id: true
            }
        });

        if (artworkToDisconnect.length > 0) {
            log.trace(
                {disconnectCount: artworkToDisconnect.length, trackId},
                "Disconnecting artwork that was removed from track"
            );

            for (const artwork of artworkToDisconnect) {
                transactionQueries.push(
                    db.track.update({
                        where: {
                            id: trackId
                        },
                        data: {
                            artworks: {
                                disconnect: {
                                    id: artwork.id
                                }
                            }
                        }
                    })
                );
            }
        }
    }

    log.trace(
        {queryCount: transactionQueries.length},
        "Committing transaction to update artwork connections"
    );

    await db.$transaction(transactionQueries);
}
