import {app, dialog, protocol} from "electron";
import {join, normalize} from "path";
import {unescape} from "querystring";
import {handle} from "../lib/ipc/main";
import {
    AlbumListResponse,
    AlbumSongsRequest,
    AlbumSongsResponse,
    EVENT_ALBUM_LIST,
    EVENT_ALBUM_SONGS,
    EVENT_DATABASE_INIT,
    EVENT_MUSIC_IMPORT,
    EVENT_SELECT_MUSIC_IMPORT_PATH,
    MusicImportRequest
} from "../lib/ipc-constants";
import {log} from "./logger";
import {
    getAllAlbums,
    getSongsByAlbum,
    importMusic,
    initialise as initialiseDatabase
} from "./database";
import {store} from "./configuration";

app.on("ready", () => {
    protocol.interceptFileProtocol("music-store", (request, callback) => {
        const url = unescape(request.url.substring("music-store://".length));
        const path = join(store.get("musicStore"), normalize(url));
        callback({path});
    });
});

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

handle<AlbumListResponse>(EVENT_ALBUM_LIST, async () => {
    const albums = await getAllAlbums();

    return {
        albums
    };
});

handle<AlbumSongsResponse, AlbumSongsRequest>(EVENT_ALBUM_SONGS, async arg => {
    const songs = await getSongsByAlbum(arg.albumId);

    return {
        songs
    };
});
