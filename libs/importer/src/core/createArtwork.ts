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
    const {db, progress} = getContext();

    const imageSourcesById = await db.selectFrom("ImageSource")
        .leftJoin("AudioSource", "AudioSource.embeddedImageSourceId", "ImageSource.id")
        .where("ImageSource.id", "in", Array.from(imageSourceIdToAudioSourceId.keys()))
        .select(["ImageSource.id", "ImageSource.path", "AudioSource.id as embeddedInId"])
        .execute()
        .then(res => new Map(res.map(imageSource => [imageSource.id, imageSource])));

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

    progress.start("artworkFingerprints", imageSourceIdToAudioSourceId.size);
    await Promise.all(
        Array.from(imageSourceIdToAudioSourceId.keys()).map(
            async imageSourceId => {
                const {path: imageSourcePath, embeddedInId} =
                    imageSourcesById.get(imageSourceId)!;

                const fingerprintResult = await queue
                    .run({
                        path: imageSourcePath,
                        embedded: embeddedInId != null
                    })
                    .catch(err =>
                        err instanceof Error ? err : new Error(err)
                    );

                if (fingerprintResult instanceof Error) {
                    log.warn(
                        {
                            imageSourcePath,
                            embedded: embeddedInId !== null,
                            error: fingerprintResult
                        },
                        "Failed to calculate fingerprint for image source, skipping"
                    );
                    progress.increment();
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

                await db.transaction().execute(async trx => {
                    const {id: artworkId} = await trx.insertInto("Artwork")
                        .values({
                            updatedAt: new Date().toISOString(),
                            fingerprint,
                            // Average colour is added later
                            avgColour: "#000"
                        })
                        .onConflict(oc => {
                            return oc.doUpdateSet({
                                // Need to update *something* so we can get the ID
                                fingerprint
                            });
                        })
                        .returning("id")
                        .executeTakeFirstOrThrow();

                    await trx.updateTable("ImageSource")
                        .where("id", "=", imageSourceId)
                        .set("artworkId", artworkId)
                        .execute();
                });

                progress.increment();
            }
        )
    );

    await db.transaction().execute(async trx => {
        // Track ID -> Artwork IDs
        const trackUsedArtworkIds = new Map<number, number[]>();

        for (const [imageSourceId, audioSourceId] of imageSourceIdToAudioSourceId) {
            console.log("Linking image source", imageSourceId, "to audio source", audioSourceId);

            const artwork = await trx.selectFrom("Artwork")
                .innerJoin("ImageSource", "ImageSource.artworkId", "Artwork.id")
                .where("ImageSource.id", "=", imageSourceId)
                .select("Artwork.id")
                .executeTakeFirst();
            if (!artwork) continue;

            const track = await trx.selectFrom("Track")
                .innerJoin("AudioSource", "AudioSource.trackId", "Track.id")
                .where("AudioSource.id", "=", audioSourceId)
                .select("Track.id")
                .executeTakeFirst();
            if (!track) continue;

            trackUsedArtworkIds.set(track.id, [
                ...(trackUsedArtworkIds.get(track.id) ?? []),
                artwork.id
            ]);

            await trx.insertInto("_ArtworkToTrack")
                .values({
                    A: artwork.id,
                    B: track.id
                })
                .onConflict(oc => oc.doNothing())
                .execute();
        }

        /*for (const [trackId, usedArtworkIds] of trackUsedArtworkIds) {
            await trx.deleteFrom("_ArtworkToTrack")
                .where("A", "=", trackId)
                .where("B", "not in", usedArtworkIds)
                .execute();
        }*/
    });
}
