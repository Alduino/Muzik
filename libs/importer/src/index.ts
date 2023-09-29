import * as Prisma from "@muzik/db";
import {discoverSources} from "./core/discover";
import {log} from "./logger";
import {Progress} from "./utils/Progress";
import {setContext} from "./utils/context";

export interface ImporterOptions {
    dbPath: string;
    directories: string[];
}

interface ImporterResult {
    progress: Progress;
    promise: Promise<true | Error>;
}

export function importTracks(options: ImporterOptions): ImporterResult {
    const progress = new Progress();

    const database = new Prisma.PrismaClient({
        datasourceUrl: `file:${options.dbPath}?connection_limit=1`
    });

    setContext({
        progress,
        db: database
    });

    const promise = (async (): Promise<true | Error> => {
        try {
            await discoverSources(options.directories);

            log.info("Vacuuming database");
            console.log("Vacuuming database");
            await database.$executeRawUnsafe("VACUUM");
            return true;
        } catch (err) {
            log.fatal(err, "Failed to import tracks");
            return err as Error;
        } finally {
            await database.$disconnect();
        }
    })();

    return {
        progress,
        promise
    };
}
