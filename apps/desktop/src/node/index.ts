import {app, dialog, protocol} from "electron";
import {handle} from "../lib/ipc/main";
import {
    AlbumListResponse,
    AlbumSongsRequest,
    AlbumSongsResponse,
    EVENT_ALBUM_LIST,
    EVENT_ALBUM_SONGS,
    EVENT_DATABASE_INIT,
    EVENT_GET_ALL_SONG_IDS,
    EVENT_GET_SONG,
    EVENT_MUSIC_IMPORT,
    EVENT_REDUX_DEV_TOOLS_ENABLED,
    EVENT_SELECT_MUSIC_IMPORT_PATH,
    GetSongRequest,
    GetSongResponse,
    MusicImportRequest
} from "../lib/ipc-constants";
import {log} from "./logger";
import {
    getAlbumById,
    getAllAlbums,
    getAllSongIds,
    getSongById,
    getSongsByAlbum,
    importMusic,
    initialise as initialiseDatabase
} from "./database";
import {store} from "./configuration";
import {listen as beginAAServer} from "./album-art-server";

beginAAServer();

protocol.registerSchemesAsPrivileged([
    {
        scheme: "albumart",
        privileges: {
            supportFetchAPI: true,
            corsEnabled: true
        }
    }
]);

app.on("ready", () => {
    protocol.interceptFileProtocol("albumart", async (request, callback) => {
        const id = parseInt(request.url.substring("albumart://".length));
        const album = await getAlbumById(id, false);
        if (!album || !album.art) return callback({error: 404});
        callback(album.art.path);
    });

    protocol.registerFileProtocol("audio", async (request, callback) => {
        const id = parseInt(request.url.substring("audio://".length));
        const song = await getSongById(id, false);
        if (!song) return callback({error: 404});
        callback(song.path);
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

handle<GetSongResponse, GetSongRequest>(EVENT_GET_SONG, async arg => {
    const song = await getSongById(arg.songId);

    return {
        song
    };
});

handle(EVENT_GET_ALL_SONG_IDS, async () => {
    const songIds = await getAllSongIds();

    return {songIds};
});

handle(EVENT_REDUX_DEV_TOOLS_ENABLED, () => {
    return !process.env.DISABLE_REDUX_DEVTOOLS;
});
