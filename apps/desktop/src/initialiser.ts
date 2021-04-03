import {Database} from "@muzik/database";
import {log} from "./logger";

async function initialiseDatabase(): Promise<Database> {
    log.trace("Creating database");
    const db = await Database.create(Database.defaultLocation);
    log.trace("Initialising database");
    db.initialise();
    return db;
}

interface InitialiseResult {
    database: Promise<Database>;
}

export default function initialise(): InitialiseResult {
    log.debug("Initialising...");
    return {
        database: initialiseDatabase()
    };
}
