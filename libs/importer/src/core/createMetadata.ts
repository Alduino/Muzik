import {PrismaPromise} from "@muzik/db";
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

    const transactionQueries: PrismaPromise<unknown>[] = [];
    const thisTransactionNewAlbums = new Set<string>();
    const thisTransactionNewArtists = new Set<string>();

    const tracks = await db.track.findMany({
        where: {
            sources: {
                some: {
                    id: {
                        in: audioSourceMetadataWithIds.map(
                            metadata => metadata.id
                        )
                    }
                }
            }
        },
        select: {
            id: true,
            sources: {
                select: {
                    id: true
                }
            }
        }
    });

    for (const track of tracks) {
        const audioSourcesMetadata = track.sources
            .map(source => audioSourceMetadataById.get(source.id))
            .filter(Boolean) as AudioSourceMetadataWithId[];

        const releaseYear = findRawMetadata(
            audioSourcesMetadata,
            metadata => metadata.common.year
        );

        transactionQueries.push(
            db.track.update({
                where: {
                    id: track.id
                },
                data: {
                    releaseYear: releaseYear ?? null
                }
            })
        );

        const trackNumber = findRawMetadata(
            audioSourcesMetadata,
            metadata => metadata.common.track.no
        );

        transactionQueries.push(
            db.track.update({
                where: {
                    id: track.id
                },
                data: {
                    trackNumber: trackNumber ?? null
                }
            })
        );

        const name = findRawMetadata(
            audioSourcesMetadata,
            metadata => metadata.common.title
        );

        if (!name) {
            log.warn(
                "Track %s has no name (which is a required field), cannot add further metadata",
                track.id
            );

            continue;
        }

        const sortableName = normaliseName(name);

        transactionQueries.push(
            db.track.update({
                where: {
                    id: track.id
                },
                data: {
                    name,
                    sortableName
                }
            })
        );

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

            const albumKey = JSON.stringify([
                sortableAlbumName,
                sortableAlbumArtist
            ]);

            if (thisTransactionNewAlbums.has(albumKey)) {
                // Been added in this transaction, need to commit to get the ID

                log.trace(
                    "Committing transaction (%s queries) to use created album",
                    transactionQueries.length
                );

                await db.$transaction(transactionQueries);

                transactionQueries.length = 0;
                thisTransactionNewAlbums.clear();
                thisTransactionNewArtists.clear();
            }

            const existingAlbum = await db.album.findUnique({
                where: {
                    sortableName_sortableAlbumArtist: {
                        sortableName: sortableAlbumName,
                        sortableAlbumArtist
                    }
                },
                select: {
                    id: true
                }
            });

            if (existingAlbum) {
                usedAlbumIds.add(existingAlbum.id);

                transactionQueries.push(
                    db.track.update({
                        where: {
                            id: track.id
                        },
                        data: {
                            albums: {
                                connect: {
                                    id: existingAlbum.id
                                },
                                update: albumTrackCount
                                    ? {
                                          where: {
                                              id: existingAlbum.id
                                          },
                                          data: {
                                              trackCount: albumTrackCount
                                          }
                                      }
                                    : undefined
                            }
                        }
                    })
                );
            } else {
                log.trace(
                    "Creating new album, %s by %s",
                    sortableAlbumName,
                    sortableAlbumArtist
                );

                transactionQueries.push(
                    db.album.create({
                        data: {
                            name: albumName,
                            sortableName: sortableAlbumName,
                            albumArtist,
                            sortableAlbumArtist,
                            trackCount: albumTrackCount ?? null,
                            tracks: {
                                connect: {
                                    id: track.id
                                }
                            }
                        }
                    })
                );

                thisTransactionNewAlbums.add(albumKey);
            }
        }

        const albumsToDisconnect = await db.album.findMany({
            where: {
                tracks: {
                    some: {
                        id: track.id
                    }
                },
                id: {
                    notIn: Array.from(usedAlbumIds)
                }
            },
            select: {
                id: true
            }
        });

        if (albumsToDisconnect.length > 0) {
            log.trace(
                "Disconnecting %s albums that were removed from track %s",
                albumsToDisconnect.length,
                track.id
            );

            for (const album of albumsToDisconnect) {
                transactionQueries.push(
                    db.track.update({
                        where: {
                            id: track.id
                        },
                        data: {
                            albums: {
                                disconnect: {
                                    id: album.id
                                }
                            }
                        }
                    })
                );
            }
        }

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

            if (thisTransactionNewArtists.has(sortableArtistName)) {
                // Been added in this transaction, need to commit to get the ID

                log.trace(
                    "Committing transaction (%s queries) to use created artist",
                    transactionQueries.length
                );

                await db.$transaction(transactionQueries);

                transactionQueries.length = 0;
                thisTransactionNewAlbums.clear();
                thisTransactionNewArtists.clear();
            }

            const existingArtist = await db.artist.findUnique({
                where: {
                    sortableName: sortableArtistName
                }
            });

            if (existingArtist) {
                usedArtistIds.add(existingArtist.id);

                transactionQueries.push(
                    db.track.update({
                        where: {
                            id: track.id
                        },
                        data: {
                            artists: {
                                connect: {
                                    id: existingArtist.id
                                }
                            }
                        }
                    })
                );
            } else {
                log.trace("Creating new artist, %s", sortableArtistName);

                transactionQueries.push(
                    db.artist.create({
                        data: {
                            name: artistName,
                            sortableName: sortableArtistName,
                            tracks: {
                                connect: {
                                    id: track.id
                                }
                            }
                        }
                    })
                );

                thisTransactionNewArtists.add(sortableArtistName);
            }
        }

        const artistsToDisconnect = await db.artist.findMany({
            where: {
                tracks: {
                    some: {
                        id: track.id
                    }
                },
                id: {
                    notIn: Array.from(usedArtistIds)
                }
            }
        });

        if (artistsToDisconnect.length > 0) {
            log.trace(
                "Disconnecting %s artists that were removed from track %s",
                artistsToDisconnect.length,
                track.id
            );

            for (const artist of artistsToDisconnect) {
                transactionQueries.push(
                    db.track.update({
                        where: {
                            id: track.id
                        },
                        data: {
                            artists: {
                                disconnect: {
                                    id: artist.id
                                }
                            }
                        }
                    })
                );
            }
        }
    }

    if (transactionQueries.length > 0) {
        log.trace(
            "Committing transaction (%s queries) to finish",
            transactionQueries.length
        );

        await db.$transaction(transactionQueries);
    }
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
