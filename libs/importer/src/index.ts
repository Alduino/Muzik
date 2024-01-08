import {DB} from "@muzik/db";
import SQLite from "better-sqlite3";
import {Kysely, sql, SqliteDialect} from "kysely";
import {discoverSources} from "./core/discover";
import {log} from "./logger";
import {Progress} from "./utils/Progress";
import {setContext} from "./utils/context";

export type {Progress};

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

    const db = new Kysely<DB>({
        dialect: new SqliteDialect({
            database: new SQLite(options.dbPath)
        }),
        log: ["error", "query"]
    })

    setContext({
        progress,
        db
    });

    const promise = (async (): Promise<true | Error> => {
        try {
            await discoverSources(options.directories);

            log.info("Vacuuming database");
            await sql`VACUUM`.execute(db);

            return true;
        } catch (err) {
            log.fatal(err, "Failed to import tracks");
            return err as Error;
        } finally {
            await db.destroy();
        }
    })();

    return {
        progress,
        promise
    };
}
