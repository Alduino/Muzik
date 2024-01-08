import {z} from "zod";
import {db} from "../../db.ts";
import {procedure} from "../../trpc.ts";

export const getTrackInfo = procedure
    .input(
        z.object({
            trackId: z.number().int().positive()
        })
    )
    .output(
        z.object({
            name: z.string(),
            artists: z.array(
                z.object({
                    id: z.number().int().positive(),
                    name: z.string()
                })
            ),
            artwork: z.object({
                id: z.number().int().positive(),
                avgColour: z.string()
            }).nullable()
        })
    )
    .query(async ({input}) => {
        const {name} = await db.selectFrom("Track")
            .where("id", "=", input.trackId)
            .select("name")
            .executeTakeFirstOrThrow();

        const artists = await db.selectFrom("Artist")
            .innerJoin("_ArtistToTrack", "Artist.id", "_ArtistToTrack.A")
            .where("_ArtistToTrack.B", "=", input.trackId)
            .select(["Artist.id", "Artist.name"])
            .execute();

        const artwork = await db.selectFrom("Artwork")
            .innerJoin("_ArtworkToTrack", "Artwork.id", "_ArtworkToTrack.A")
            .where("_ArtworkToTrack.B", "=", input.trackId)
            .select(["Artwork.id", "Artwork.avgColour"])
            .executeTakeFirst();

        return {
            name: name,
            artists: artists,
            artwork: artwork ? {
                id: artwork.id,
                avgColour: artwork.avgColour
            } : null
        };
    });
