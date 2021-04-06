import {dialog} from "electron";
import {handle} from "../lib/ipc/main";
import {
    EVENT_DATABASE_INIT,
    EVENT_MUSIC_IMPORT,
    EVENT_SELECT_MUSIC_IMPORT_PATH,
    MusicImportRequest
} from "../lib/ipc-constants";
import {log} from "./logger";
import {importMusic, initialise as initialiseDatabase} from "./database";
import {store} from "./configuration";

handle(EVENT_DATABASE_INIT, async () => {
    log.info("Initialising database");
    await initialiseDatabase();
});

handle<void, MusicImportRequest, number>(
    EVENT_MUSIC_IMPORT,
    async (opts, progress) => {
        log.info("Importing music");

        const timeDiff = 1000 / opts.progressFrequency;

        let lastProgressUpdate = 0;

        function importProgress(percent: number) {
            const now = Date.now();
            if (now - lastProgressUpdate < timeDiff) return;
            lastProgressUpdate = now;

            progress(percent);
        }

        await importMusic(importProgress);
    }
);

handle(EVENT_SELECT_MUSIC_IMPORT_PATH, async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"]
    });

    if (result.canceled || result.filePaths.length !== 1) return false;
    store.set("musicStore", result.filePaths[0]);
    return true;
});
