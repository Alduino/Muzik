import {log} from "../logger";
import {getContext} from "../utils/context";
import {inTransactionGroup} from "../utils/transaction-group";
import {AudioSourceMetadataWithId} from "./getMetadata";

// Note: this *only* creates new tracks, and it does not set any metadata
export async function createTracks(
    audioSourceMetadata: AudioSourceMetadataWithId[]
) {
    const {db} = getContext();

    const existingTracks = await db.selectFrom("Track")
        .leftJoin("AudioSource", "AudioSource.trackId", "Track.id")
        .select(["Track.id", "Track.hash", "AudioSource.path"])
        .execute()
        .then(res => res.map(track => ({
            id: track.id,
            hash: Number(track.hash),
            sourcePaths: track.path ? [track.path] : []
        })));

    const currentTransactionHashes = new Set<number>();

    await inTransactionGroup(db, async ctx => {
        for (const metadata of audioSourceMetadata) {
            const manuallyAddedToExistingTrack = existingTracks.some(track =>
                track.sourcePaths.includes(metadata.path)
            );

            // No need to create a new track, it is linked to an existing track
            if (manuallyAddedToExistingTrack) continue;

            if (currentTransactionHashes.has(metadata.audioSource.hash)) {
                // Been added in this transaction, need to commit to get the ID

                log.trace("Committing transaction to create duplicate track");
                await ctx.commit();
                currentTransactionHashes.clear();

                const existingTrack = await db.selectFrom("Track")
                    .where("hash", "=", metadata.audioSource.hash.toString())
                    .select("id")
                    .executeTakeFirstOrThrow();

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

                await ctx.trx().updateTable("AudioSource")
                    .where("id", "=", metadata.id)
                    .set("trackId", duplicateTrack.id)
                    .execute();

                continue;
            }

            // No track exists, so create a new one

            const {id: trackId} = await ctx.trx().insertInto("Track")
                .values({
                    updatedAt: new Date().toISOString(),
                    hash: metadata.audioSource.hash.toString(),
                    name: "",
                    sortableName: ""
                })
                .returning("id")
                .executeTakeFirstOrThrow();

            await ctx.trx().updateTable("AudioSource")
                .where("id", "=", metadata.id)
                .set("trackId", trackId)
                .execute();

            currentTransactionHashes.add(metadata.audioSource.hash);

            log.trace(
                {
                    path: metadata.path
                },
                "Creating new track"
            );
        }
    });

    log.info("Created tracks");
}
