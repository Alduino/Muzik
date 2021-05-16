import {app, clipboard, dialog, protocol, shell} from "electron";
import {
    AlbumListResponse,
    AlbumSongsRequest,
    AlbumSongsResponse,
    EVENT_ALBUM_LIST,
    EVENT_ALBUM_SONGS,
    EVENT_APP_STATE_GET,
    EVENT_APP_STATE_SET,
    EVENT_ARTIST_LIST,
    EVENT_CLIPBOARD_WRITE,
    EVENT_DATABASE_INIT,
    EVENT_FILEDIR_OPEN,
    EVENT_GET_ALL_TRACKS,
    EVENT_GET_NAMES,
    EVENT_GET_SONG,
    EVENT_MUSIC_IMPORT,
    EVENT_REDUX_DEV_TOOLS_ENABLED,
    EVENT_SELECT_MUSIC_IMPORT_PATH,
    MusicImportRequest
} from "../lib/ipc-constants";
import {log} from "./logger";
import {
    getAlbumArtByHash,
    getAlbumArtInfoByHash,
    getAllAlbums,
    getAllArtists,
    getAllTracks,
    getNamesByTrackId,
    getSongById,
    getSongsByAlbumId,
    getTrackArtHashByAlbumId,
    importMusic,
    initialise as initialiseDatabase
} from "./database";
import {store} from "./configuration";
import ExtendedAlbum from "../lib/ExtendedAlbum";
import {handle} from "../lib/ipc/main";

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
    protocol.registerBufferProtocol("albumart", async (request, callback) => {
        const hash = request.url.substring("albumart://".length);
        const art = await getAlbumArtByHash(hash);
        if (!art) return callback({error: 404});

        callback({
            headers: {
                "Content-Type": art.mimeType
            },
            data: art.source
        });
    });

    protocol.registerFileProtocol("audio", async (request, callback) => {
        const id = parseInt(request.url.substring("audio://".length));
        const song = await getSongById(id);
        if (!song) return callback({error: 404});
        callback(song.audioSrcPath);
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
    const albums = await Promise.all(
        await getAllAlbums().then(res =>
            res.map(
                async (album): Promise<ExtendedAlbum> => {
                    const trackArts = await getTrackArtHashByAlbumId(album.id);

                    const artCounts = new Map<string, number>();
                    for (const art of trackArts) {
                        artCounts.set(art, (artCounts.get(art) ?? 0) + 1);
                    }

                    const [artHash] = Array.from(
                        artCounts.entries()
                    ).reduce((prev, [hash, count]) =>
                        prev
                            ? count > prev[1]
                                ? [hash, count]
                                : prev
                            : [hash, count]
                    );

                    if (!artHash) return album;

                    const {mimeType, avgColour} = await getAlbumArtInfoByHash(
                        artHash
                    );

                    return {
                        ...album,
                        art: {
                            url: `albumart://${artHash}`,
                            mime: mimeType,
                            avgColour
                        }
                    };
                }
            )
        )
    );

    return {
        albums
    };
});

handle(EVENT_ARTIST_LIST, async () => {
    const artists = await getAllArtists();
    return {artists};
});

handle<AlbumSongsResponse, AlbumSongsRequest>(EVENT_ALBUM_SONGS, async arg => {
    const songs = await Promise.all(
        await getSongsByAlbumId(arg.albumId).then(tracks =>
            tracks.map(async track => {
                const trackArt = await getAlbumArtInfoByHash(
                    track.albumArtHash
                );
                return {
                    ...track,
                    art: trackArt && {
                        url: `albumart://${track.albumArtHash}`,
                        mime: trackArt.mimeType,
                        avgColour: trackArt.avgColour
                    }
                };
            })
        )
    );

    return {
        songs
    };
});

handle(EVENT_GET_SONG, async arg => {
    if (!arg.songId) return undefined;

    const song = await getSongById(arg.songId);
    const trackArt = await getAlbumArtInfoByHash(song.albumArtHash);

    return {
        song: {
            ...song,
            art: trackArt && {
                url: `albumart://${trackArt.hash}`,
                mime: trackArt.mimeType,
                avgColour: trackArt.avgColour
            }
        }
    };
});

handle(EVENT_GET_ALL_TRACKS, async () => {
    const tracks = await getAllTracks();

    const tracksMapped = tracks.map(trackAndArt => {
        const {mimeType, avgColour, hash, ...track} = trackAndArt;
        return {
            ...track,
            art: hash && {url: `albumart://${hash}`, mime: mimeType, avgColour}
        };
    });

    return {tracks: tracksMapped};
});

handle(EVENT_GET_NAMES, async arg => {
    return getNamesByTrackId(arg.trackId);
});

handle(EVENT_CLIPBOARD_WRITE, arg => {
    clipboard.write(arg);
});

handle(EVENT_FILEDIR_OPEN, arg => {
    shell.showItemInFolder(arg.path);
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
