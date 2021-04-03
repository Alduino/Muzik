import {Database} from "@muzik/database";

async function initialiseDatabase() {
    const db = await Database.create(Database.defaultLocation);
    db.initialise();
    return db;
}

interface InitialiseResult {
    database: Promise<Database>;
}

export default function initialise(): InitialiseResult {
    return {
        database: initialiseDatabase()
    };
}
