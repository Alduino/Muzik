import {z} from "zod";
import {prisma} from "../../prisma.ts";
import {procedure} from "../../trpc.ts";

export const getTrackInfo = procedure
    .input(
        z.object({
            trackId: z.number().int().positive()
        })
    )
    .query(async ({input}) => {
        const data = await prisma.track.findUniqueOrThrow({
            where: {
                id: input.trackId
            },
            select: {
                name: true,
                artists: {
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

        const artwork = data.artworks.at(0);

        return {
            name: data.name,
            artists: data.artists,
            artwork: artwork && {
                id: artwork.id,
                avgColour: artwork.avgColour
            }
        };
    });
