import {z} from "zod";
import {prisma} from "../../prisma.ts";
import {procedure} from "../../trpc.ts";

export const imageSource = procedure
    .input(
        z.object({
            artworkId: z.number()
        })
    )
    .query(async ({input}) => {
        const {sources} = await prisma.artwork.findUniqueOrThrow({
            where: {
                id: input.artworkId
            },
            select: {
                sources: {
                    select: {
                        id: true,
                        width: true,
                        height: true
                    }
                }
            }
        });

        return sources;
    });
