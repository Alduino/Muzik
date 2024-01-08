import {z} from "zod";
import {db} from "../../db.ts";
import {procedure} from "../../trpc.ts";

export const imageSource = procedure
    .input(
        z.object({
            artworkId: z.number()
        })
    )
    .output(z.array(z.object({
        id: z.number(),
        width: z.number().positive(),
        height: z.number().positive()
    })))
    .query(async ({input}) => {
        return await db.selectFrom("ImageSource")
            .innerJoin("Artwork", "Artwork.id", "ImageSource.artworkId")
            .where("Artwork.id", "=", input.artworkId)
            .select(["ImageSource.id", "ImageSource.width", "ImageSource.height"])
            .execute();
    });
