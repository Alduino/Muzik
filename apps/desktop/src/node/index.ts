import {handle} from "../lib/ipc/main";
import {
    EVENT_DATABASE_INIT,
    EVENT_MUSIC_IMPORT,
    EVENT_SET_MUSIC_PATH,
    MusicImportRequest,
    SetMusicPathRequest
} from "../lib/ipc-constants";
import {log} from "./logger";
import {importMusic, initialise as initialiseDatabase} from "./database";
import {store} from "./configuration";

handle(EVENT_DATABASE_INIT, async () => {
    log.info("Initialising database");
    await initialiseDatabase();
});

handle<void, SetMusicPathRequest>(EVENT_SET_MUSIC_PATH, opts => {
    store.set("musicStore", opts.path);
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
