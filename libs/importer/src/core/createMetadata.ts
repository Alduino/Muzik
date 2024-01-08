import {log} from "../logger";
import {getContext} from "../utils/context";
import {normaliseName} from "../utils/normaliseName";
import {AudioSourceMetadataWithId} from "./getMetadata";

export async function createMetadata(
    audioSourceMetadataWithIds: AudioSourceMetadataWithId[]
) {
    const audioSourceMetadataById = new Map(
        audioSourceMetadataWithIds.map(metadata => [metadata.id, metadata])
    );

    const {db} = getContext();

    await db.transaction().execute(async trx => {
        const tracksUngrouped = await trx.selectFrom("Track")
            .innerJoin("AudioSource", "AudioSource.trackId", "Track.id")
            .where("AudioSource.id", "in", audioSourceMetadataWithIds.map(metadata => metadata.id))
            .select(["Track.id as trackId", "AudioSource.id as audioSourceId"])
            .execute();

        const tracks = tracksUngrouped.reduce((acc, track) => {
            if (!acc.has(track.trackId)) {
                acc.set(track.trackId, []);
            }

            acc.get(track.trackId)!.push(track.audioSourceId);

            return acc;
        }, new Map<number, number[]>());

        for (const [trackId, audioSourceIds] of tracks) {
            const audioSourcesMetadata = audioSourceIds
                .map(source => audioSourceMetadataById.get(source))
                .filter(Boolean) as AudioSourceMetadataWithId[];

            const releaseYear = findRawMetadata(
                audioSourcesMetadata,
                metadata => metadata.common.year
            );

            await trx.updateTable("Track")
                .where("id", "=", trackId)
                .set("releaseYear", releaseYear ?? null)
                .execute();

            const trackNumber = findRawMetadata(
                audioSourcesMetadata,
                metadata => metadata.common.track.no
            );

            await trx.updateTable("Track")
                .where("id", "=", trackId)
                .set("trackNumber", trackNumber ?? null)
                .execute();

            const name = findRawMetadata(
                audioSourcesMetadata,
                metadata => metadata.common.title
            );

            if (!name) {
                log.warn(
                    {audioSourceIds},
                    "Track %s has no name (which is a required field), cannot add further metadata",
                    trackId
                );

                continue;
            }

            const sortableName = normaliseName(name);

            await trx.updateTable("Track")
                .where("id", "=", trackId)
                .set("name", name)
                .set("sortableName", sortableName)
                .execute();

            const usedAlbumIds = new Set<number>();

            for (const metadata of audioSourcesMetadata) {
                const albumName = metadata.audioSource.rawMetadata.common.album;

                const albumArtist = (
                    metadata.audioSource.rawMetadata.common.albumartist ??
                    metadata.audioSource.rawMetadata.common.artist
                )?.split(/[,;] /)[0];

                const albumTrackCount =
                    metadata.audioSource.rawMetadata.common.track.of;

                if (!albumName || !albumArtist) continue;

                const sortableAlbumName = normaliseName(albumName);
                const sortableAlbumArtist = normaliseName(albumArtist);

                const existingAlbum = await trx.selectFrom("Album")
                    .where("sortableName", "=", sortableAlbumName)
                    .where("sortableAlbumArtist", "=", sortableAlbumArtist)
                    .select("id")
                    .executeTakeFirst();

                if (existingAlbum) {
                    usedAlbumIds.add(existingAlbum.id);

                    await trx.updateTable("Album")
                        .where("id", "=", existingAlbum.id)
                        .set("trackCount", albumTrackCount ?? null)
                        .execute();

                    await trx.insertInto("_AlbumToTrack")
                        .values({
                            A: existingAlbum.id,
                            B: trackId
                        })
                        .onConflict(oc => oc.doNothing())
                        .execute();
                } else {
                    log.trace(
                        "Creating new album, %s by %s",
                        sortableAlbumName,
                        sortableAlbumArtist
                    );

                    const {id: albumId} = await trx.insertInto("Album")
                        .values({
                            updatedAt: new Date().toISOString(),
                            name: albumName,
                            sortableName: sortableAlbumName,
                            albumArtist,
                            sortableAlbumArtist,
                            trackCount: albumTrackCount ?? null
                        })
                        .returning("id")
                        .executeTakeFirstOrThrow();

                    await trx.insertInto("_AlbumToTrack")
                        .values({
                            A: albumId,
                            B: trackId
                        })
                        .execute();

                    usedAlbumIds.add(albumId);
                }
            }

            await trx.deleteFrom("_AlbumToTrack")
                .where("B", "=", trackId)
                .where("A", "not in", Array.from(usedAlbumIds))
                .execute();

            const artistNames = (
                audioSourcesMetadata
                    .flatMap(
                        metadata => metadata.audioSource.rawMetadata.common.artists
                    )
                    .filter(Boolean) as string[]
            ).flatMap(artist => artist.split(/[,;] /));

            const usedArtistIds = new Set<number>();

            for (const artistName of artistNames as string[]) {
                const sortableArtistName = normaliseName(artistName);

                const existingArtist = await trx.selectFrom("Artist")
                    .where("sortableName", "=", sortableArtistName)
                    .select("id")
                    .executeTakeFirst();

                if (existingArtist) {
                    usedArtistIds.add(existingArtist.id);

                    await trx.insertInto("_ArtistToTrack")
                        .values({
                            A: existingArtist.id,
                            B: trackId
                        })
                        .onConflict(oc => oc.doNothing())
                        .execute();
                } else {
                    log.trace("Creating new artist, %s", sortableArtistName);

                    const {id: artistId} = await trx.insertInto("Artist")
                        .values({
                            updatedAt: new Date().toISOString(),
                            name: artistName,
                            sortableName: sortableArtistName
                        })
                        .returning("id")
                        .executeTakeFirstOrThrow();

                    await trx.insertInto("_ArtistToTrack")
                        .values({
                            A: artistId,
                            B: trackId
                        })
                        .execute();

                    usedArtistIds.add(artistId);
                }
            }

            await trx.deleteFrom("_ArtistToTrack")
                .where("B", "=", trackId)
                .where("A", "not in", Array.from(usedArtistIds))
                .execute();
        }
    });
}

function findRawMetadata<T>(
    metadata: AudioSourceMetadataWithId[],
    getter: (
        metadata: AudioSourceMetadataWithId["audioSource"]["rawMetadata"]
    ) => T
): T | undefined {
    return metadata
        .map(metadata => getter(metadata.audioSource.rawMetadata))
        .find(Boolean);
}
