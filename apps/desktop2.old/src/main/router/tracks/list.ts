import {z} from "zod";
import {prisma} from "../../prisma.ts";
import {procedure} from "../../trpc.ts";

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
            skip: input.cursor,
            orderBy: {
                sortableName: "asc"
            },
            where:
                input.cursor != null
                    ? {
                          id: {
                              gt: input.cursor
                          }
                      }
                    : undefined,
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
                }
            }
        });

        return data.map(track => ({
            id: track.id,
            name: track.name,
            duration: track.sources[0].duration,
            artists: track.artists.map(artist => ({
                id: artist.id,
                name: artist.name
            })),
            album:
                track.albums.length > 0
                    ? {
                          id: track.albums[0].id,
                          name: track.albums[0].name
                      }
                    : null
        }));
    });
