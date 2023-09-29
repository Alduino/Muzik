import {dialog} from "electron";
import {z} from "zod";
import {procedure} from "../../trpc.ts";

export const showOpenDialog = procedure
    .input(
        z.object({
            properties: z.array(
                z.enum([
                    "openFile",
                    "openDirectory",
                    "multiSelections",
                    "showHiddenFiles",
                    "createDirectory",
                    "promptToCreate",
                    "noResolveAliases",
                    "treatPackageAsDirectory",
                    "dontAddToRecent"
                ])
            )
        })
    )
    .mutation(async ({input}) => {
        return await dialog.showOpenDialog({
            properties: input.properties
        });
    });
