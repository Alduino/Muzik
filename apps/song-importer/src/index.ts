import {Database} from "@muzik/database";
import {log} from "./logger";
import scan from "@muzik/song-scanner";

(async () => {
    log.info("Hello, world!");

    const scanDir = process.argv[2];
    if (!scanDir) throw new Error("Expecting `song-importer [scanDir]`");

    log.debug("Will run scan on %s", scanDir);

    const db = await Database.create(Database.defaultLocation);
    await db.initialise();

    let lastProgressLogTime = 0;

    await scan(db, scanDir, progress => {
        const now = Date.now();

        if (now - lastProgressLogTime > 100) {
            log.debug("Progress: %s%", Math.round(progress));
            lastProgressLogTime = now;
        }
    });
})();