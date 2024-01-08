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

    // TODO: N+1

    return await Promise.all(tracks.map(async track => {
        const {duration} = await db.selectFrom("AudioSource")
            .select("duration")
            .where("trackId", "=", track.id)
            .executeTakeFirstOrThrow();

        const artists = await db.selectFrom("Artist")
            .innerJoin("_ArtistToTrack", "_ArtistToTrack.A", "Artist.id")
            .where("_ArtistToTrack.B", "=", track.id)
            .select(["Artist.id", "Artist.name"])
            .execute();

        const album = await db.selectFrom("Album")
            .innerJoin("_AlbumToTrack", "_AlbumToTrack.A", "Album.id")
            .where("_AlbumToTrack.B", "=", track.id)
            .select(["Album.id", "Album.name"])
            .executeTakeFirst() ?? null;

        const artwork = await db.selectFrom("Artwork")
            .innerJoin("_ArtworkToTrack", "_ArtworkToTrack.A", "Artwork.id")
            .where("_ArtworkToTrack.B", "=", track.id)
            .select(["Artwork.id", "Artwork.avgColour"])
            .executeTakeFirst() ?? null;

        return {
            id: track.id,
            name: track.name,
            duration,
            artists,
            album,
            artwork
        };
    }));
});
