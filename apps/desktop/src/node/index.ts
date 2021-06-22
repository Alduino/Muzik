import {app, clipboard, dialog, protocol, shell} from "electron";
import {
    EVENT_APP_STATE_GET,
    EVENT_APP_STATE_SET,
    EVENT_ARTIST_LIST,
    EVENT_CLIPBOARD_WRITE,
    EVENT_DATABASE_INIT,
    EVENT_MUSIC_IMPORT,
    EVENT_REDUX_DEV_TOOLS_ENABLED,
    MusicImportRequest
} from "../lib/ipc-constants";
import {handle} from "../lib/ipc/main";
import handleGetAlbumList from "../lib/rpc/album-list/node";
import handleGetExtendedAlbum from "../lib/rpc/extended-album/node";
import handleGetAlbumTrackIds from "../lib/rpc/get-album-track-ids/node";
import handleGetAllTrackIds from "../lib/rpc/get-all-track-ids/node";
import handleGetArtist from "../lib/rpc/get-artist/node";
import handleGetFirstArtistLettersByAlbumIds from "../lib/rpc/get-first-artist-letters-by-album-ids/node";
import handleGetFirstArtistLettersByTrackIds from "../lib/rpc/get-first-artist-letters-by-track-ids/node";
import handleGetNames from "../lib/rpc/get-names/node";
import handleGetSong from "../lib/rpc/get-song/node";
import handleGetSourceDirectories from "../lib/rpc/get-source-directories/node";
import handleOpenFileDirectory from "../lib/rpc/open-file-directory/node";
import handleSelectDirectory from "../lib/rpc/select-directory/node";
import handleSetSourceDirectories from "../lib/rpc/set-source-directories/node";
import {store} from "./configuration";
import {
    getAlbumArtByHash,
    getAlbumArtInfoByHash,
    getAlbumById,
    getAllAlbums,
    getAllArtists,
    getAllTracks,
    getArtistById,
    getFirstArtistLettersByAlbumIds,
    getFirstArtistLettersByTrackIds,
    getNamesByTrackId,
    getSongById,
    getTrackArtHashByAlbumId,
    getTracksByAlbumId,
    importMusic,
    initialise as initialiseDatabase,
    updateSongDirectories
} from "./database";
import {log} from "./logger";

protocol.registerSchemesAsPrivileged([
    {
        scheme: "albumart",
        privileges: {
            supportFetchAPI: true,
            secure: true
        }
    }
]);

protocol.registerSchemesAsPrivileged([
    {
        scheme: "audio",
        privileges: {
            supportFetchAPI: true,
            secure: true
        }
    }
]);

app.on("ready", () => {
    protocol.registerBufferProtocol("albumart", async (request, callback) => {
        const hash = request.url.substring("albumart://".length);
        const art = await getAlbumArtByHash(hash);
        if (!art) return callback({error: 404});

        callback({
            headers: {
                "Content-Type": art.mimeType,
                "Cache-Control": "public, max-age=31536000, immutable"
            },
            data: art.source
        });
    });

    protocol.registerFileProtocol("audio", async (request, callback) => {
        const id = parseInt(request.url.substring("audio://".length));
        const song = await getSongById(id);
        if (!song) return callback({error: 404});
        callback({
            path: song.audioSrcPath,
            headers: {
                "Cache-Control": "public, max-age=31536000, immutable"
            }
        });
    });
});

async function getMostCommonAlbumArtHash(
    albumId: number
): Promise<string | undefined> {
    const trackArts = await getTrackArtHashByAlbumId(albumId);

    const artCounts = new Map<string, number>();
    for (const art of trackArts) {
        artCounts.set(art, (artCounts.get(art) ?? 0) + 1);
    }

    const [artHash] = Array.from(
        artCounts.entries()
    ).reduce((prev, [hash, count]) =>
        prev ? (count > prev[1] ? [hash, count] : prev) : [hash, count]
    );

    return artHash;
}

handle(EVENT_DATABASE_INIT, async () => {
    log.info("Initialising database");
    await initialiseDatabase();
});

handle<void, MusicImportRequest, number>(
    EVENT_MUSIC_IMPORT,
    async (opts = {}, progress) => {
        log.info("Importing music");

        const timeDiff = 1000 / (opts.progressFrequency ?? 1);

        let lastProgressUpdate = 0;

        function importProgress(percent: number) {
            const now = Date.now();
            if (now - lastProgressUpdate < timeDiff) return;
            lastProgressUpdate = now;

            progress(percent);
        }

        if (!opts.progressFrequency) {
            await importMusic(importProgress);
        } else {
            await importMusic(() => {
                /* noop */
            });
        }
    }
);

handleGetAlbumList(getAllAlbums);

handleGetArtist(async ({artistId}) => getArtistById(artistId));

handleGetExtendedAlbum(async id => {
    const album = await getAlbumById(id);

    const artHash = await getMostCommonAlbumArtHash(id);

    if (!artHash) return album;

    const {mimeType, avgColour} = await getAlbumArtInfoByHash(artHash);

    return {
        ...album,
        art: {
            url: `albumart://${artHash}`,
            mime: mimeType,
            avgColour
        }
    };
});

handle(EVENT_ARTIST_LIST, async () => {
    const artists = await getAllArtists();
    return {artists};
});

handleGetAlbumTrackIds(async ({albumId}) => {
    return {
        trackIds: await getTracksByAlbumId(albumId)
    };
});

handleGetSong(async ({songId}) => {
    const song = await getSongById(songId);
    if (!song) throw new Error(`There is no song with the id ${songId}`);
    const trackArt = await getAlbumArtInfoByHash(song.albumArtHash);

    return {
        ...song,
        art: trackArt && {
            url: `albumart://${trackArt.hash}`,
            mime: trackArt.mimeType,
            avgColour: trackArt.avgColour
        }
    };
});

handleGetAllTrackIds(async () => {
    return {
        trackIds: await getAllTracks()
    };
});

handleGetNames(async ({trackId}) => {
    return getNamesByTrackId(trackId);
});

handleGetFirstArtistLettersByTrackIds(async ({trackIds}) => {
    return getFirstArtistLettersByTrackIds(trackIds);
});

handleGetFirstArtistLettersByAlbumIds(async ({albumIds}) => {
    return getFirstArtistLettersByAlbumIds(albumIds);
});

handle(EVENT_CLIPBOARD_WRITE, arg => {
    clipboard.write(arg);
});

handleOpenFileDirectory(async ({filePath}) => {
    shell.showItemInFolder(filePath);
});

handle(EVENT_APP_STATE_GET, () => {
    return store.get("appState");
});

handle(EVENT_APP_STATE_SET, arg => {
    store.set("appState", arg);
});

handle(EVENT_REDUX_DEV_TOOLS_ENABLED, () => {
    const envVar = process.env.DISABLE_REDUX_DEVTOOLS;
    if (!envVar) return true;
    return envVar === "0" || envVar === "false" || envVar === "no";
});

handleGetSourceDirectories(async () => store.get("musicStore") ?? []);

handleSelectDirectory(async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"]
    });

    return {
        path:
            result.canceled || result.filePaths.length !== 1
                ? null
                : result.filePaths[0]
    };
});

handleSetSourceDirectories(async ({paths}) => {
    store.set("musicStore", paths);
    await updateSongDirectories(paths);
});
