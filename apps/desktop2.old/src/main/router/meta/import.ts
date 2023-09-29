import {importTracks} from "@muzik/importer";
import {dbPath} from "../../prisma.ts";
import {procedure} from "../../trpc.ts";

export const import_ = procedure.mutation(async () => {
    const {promise} = importTracks({
        dbPath,
        directories: ["/run/media/alduino/M2/AudioMedia/0 TIDAL"]
    });

    await promise;
});
