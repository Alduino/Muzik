import { z } from "zod";
import {db} from "../../db.ts";
import {procedure} from "../../trpc.ts";

export interface TrackItem {
    id: number;
    name: string;
    duration: number;
    artists: {
        id: number;
        name: string;
    }[];
    album: {
        id: number;
        name: string;
    } | null;
    artwork: {
        id: number;
        avgColour: string;
    } | null;
}

export const list = procedure.output(
    z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            duration: z.number(),
            artists: z.array(
                z.object({
                    id: z.number(),
                    name: z.string()
                })
            ),
            album: z.object({
                id: z.number(),
                name: z.string()
            }).nullable(),
            artwork: z.object({
                id: z.number(),
                avgColour: z.string()
            }).nullable()
        })
    )
).query(async () => {
    const tracks = await db.selectFrom("Track")
        .select(["id", "name"])
        .orderBy("sortableName", "asc")
        .execute();

    const durations = await db.selectFrom("AudioSource")
        .select(["trackId", "duration"])
        .execute();

    const artists = await db.selectFrom("Artist")
        .innerJoin("_ArtistToTrack", "_ArtistToTrack.A", "Artist.id")
        .select(["Artist.id", "Artist.name", "_ArtistToTrack.B as trackId"])
        .execute();

    const albums = await db.selectFrom("Album")
        .innerJoin("_AlbumToTrack", "_AlbumToTrack.A", "Album.id")
        .select(["Album.id", "Album.name", "_AlbumToTrack.B as trackId"])
        .execute();

    const artworks = await db.selectFrom("Artwork")
        .innerJoin("_ArtworkToTrack", "_ArtworkToTrack.A", "Artwork.id")
        .select(["Artwork.id", "Artwork.avgColour", "_ArtworkToTrack.B as trackId"])
        .execute();

    return tracks.map(track => {
        const duration = durations.find(d => d.trackId === track.id)?.duration ?? 0;
        const trackArtists = artists.filter(artist => artist.trackId === track.id);
        const album = albums.find(album => album.trackId === track.id) ?? null;
        const artwork = artworks.find(artwork => artwork.trackId === track.id) ?? null;

        return {
            id: track.id,
            name: track.name,
            duration,
            artists: trackArtists.map(artist => ({
                id: artist.id,
                name: artist.name
            })),
            album: album ? {
                id: album.id,
                name: album.name
            } : null,
            artwork: artwork ? {
                id: artwork.id,
                avgColour: artwork.avgColour
            } : null
        };
    });
});
