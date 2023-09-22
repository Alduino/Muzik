import {PrismaPromise} from "@muzik/db";
import {log} from "../logger";
import {getContext} from "../utils/context";
import {AudioSourceMetadataWithId} from "./getMetadata";

// Note: this *only* creates new tracks, and it does not set any metadata
export async function createTracks(
    audioSourceMetadata: AudioSourceMetadataWithId[]
) {
    const {db} = getContext();

    const existingTracks = await db.track
        .findMany({
            select: {
                id: true,
                hash: true,
                sources: {
                    select: {
                        path: true
                    }
                }
            }
        })
        .then(res =>
            res.map(track => ({
                id: track.id,
                hash: Number(track.hash),
                sourcePaths: track.sources.map(source => source.path)
            }))
        );

    const currentTransactionHashes = new Set<number>();
    const currentTransactionQueries: PrismaPromise<NonNullable<unknown>>[] = [];

    for (const metadata of audioSourceMetadata) {
        const manuallyAddedToExistingTrack = existingTracks.some(track =>
            track.sourcePaths.includes(metadata.path)
        );

        // No need to create a new track, it is linked to an existing track
        if (manuallyAddedToExistingTrack) continue;

        if (currentTransactionHashes.has(metadata.audioSource.hash)) {
            // Been added in this transaction, need to commit to get the ID

            log.trace(
                {queryCount: currentTransactionQueries.length},
                "Committing transaction to create duplicate track"
            );

            await db.$transaction(currentTransactionQueries);
            currentTransactionQueries.length = 0;
            currentTransactionHashes.clear();

            const existingTrack = await db.track.findUniqueOrThrow({
                where: {
                    hash: metadata.audioSource.hash
                },
                select: {
                    id: true
                }
            });

            existingTracks.push({
                id: existingTrack.id,
                hash: metadata.audioSource.hash,

                // only used to detect manually added tracks
                // which can't have happened yet
                sourcePaths: []
            });
        }

        const duplicateTrack = existingTracks.find(
            track => track.hash === metadata.audioSource.hash
        );

        // Not part of an existing track, but it is a duplicate (so add it to the existing track)
        if (duplicateTrack) {
            log.trace(
                {
                    trackId: duplicateTrack.id,
                    path: metadata.path
                },
                "Linking audio source to existing track"
            );

            currentTransactionQueries.push(
                db.audioSource.update({
                    where: {
                        id: metadata.id
                    },
                    data: {
                        trackId: duplicateTrack.id
                    }
                })
            );

            continue;
        }

        // No track exists, so create a new one

        currentTransactionQueries.push(
            db.track.create({
                data: {
                    hash: metadata.audioSource.hash,
                    name: "",
                    sortableName: "",
                    sources: {
                        connect: {
                            id: metadata.id
                        }
                    }
                }
            })
        );

        currentTransactionHashes.add(metadata.audioSource.hash);

        log.trace(
            {
                path: metadata.path
            },
            "Creating new track"
        );
    }

    if (currentTransactionQueries.length > 0) {
        await db.$transaction(currentTransactionQueries);
    }

    log.info("Created tracks");
}
