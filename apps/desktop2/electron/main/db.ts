import {DB} from "@muzik/db";
import SQLite from "better-sqlite3";
import { app } from "electron";
import {Kysely, SqliteDialect} from "kysely";
import {childLogger} from "../../shared/logger.ts";

const log = childLogger("db-init");

export const dbPath = app.getPath("userData") + "/db.sqlite";
log.info("Using database at %s", dbPath);

log.debug("Opening SQLite database",);
const database = (() => {
    try {
        return new SQLite(dbPath);
    } catch (err) {
        log.fatal(err, "Failed to open database");
        process.exit(1);
    }
})();

log.info("Performing connection test");
try {
    database.prepare("SELECT 1").get();
} catch (err) {
    log.fatal(err, "Failed to connect to database");
    process.exit(1);
}

log.debug("Creating Kysely dialect");
const dialect = new SqliteDialect({
    database
});

log.debug("Creating Kysely instance");
export const db = new Kysely<DB>({
    dialect,
    log: ["query", "error"]
});
