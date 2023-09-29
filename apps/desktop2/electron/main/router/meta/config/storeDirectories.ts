import {z} from "zod";
import {procedure} from "../../../trpc.ts";
import {configDb} from "../../../utils/config.ts";

export const getStoreDirectories = procedure.query(() => {
    return configDb.data.sourceDirectories;
});

export const setStoreDirectories = procedure
    .input(
        z.object({
            directories: z.array(z.string())
        })
    )
    .mutation(async ({input}) => {
        configDb.data.sourceDirectories = input.directories
            .map(dir => dir.trim())
            .filter(Boolean);
        await configDb.write();
    });
