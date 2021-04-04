import {Database} from "@muzik/database";
import {log} from "./logger";

(async () => {
    log.info("Hello, world!");

    const db = await Database.create(Database.defaultLocation);
    await db.initialise();
})();
