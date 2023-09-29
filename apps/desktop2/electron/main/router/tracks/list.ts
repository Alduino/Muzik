import {z} from "zod";
import {prisma} from "../../prisma.ts";
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

export const list = procedure
    .input(
        z.object({
            limit: z.number().min(1).max(100).default(20),
            cursor: z.number().optional()
        })
    )
    .query(async ({input}) => {
        const data = await prisma.track.findMany({
            take: input.limit,
            cursor: input.cursor
                ? {
                      id: input.cursor
                  }
                : undefined,
            skip: input.cursor ? 1 : 0,
            orderBy: {
                sortableName: "asc"
            },
            select: {
                id: true,
                name: true,
                sources: {
                    take: 1,
                    select: {
                        duration: true
                    }
                },
                artists: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                albums: {
                    take: 1,
                    select: {
                        id: true,
                        name: true
                    }
                },
                artworks: {
                    take: 1,
                    select: {
                        id: true,
                        avgColour: true
                    }
                }
            }
        });

        return {
            items: data.map<TrackItem>(track => ({
                id: track.id,
                name: track.name,
                duration: track.sources[0].duration,
                artists: track.artists.map(artist => ({
                    id: artist.id,
                    name: artist.name
                })),
                album: track.albums.length > 0 ? track.albums[0] : null,
                artwork: track.artworks.length > 0 ? track.artworks[0] : null
            })),
            nextCursor: data.length > 0 ? data.at(-1)!.id : null
        };
    });
