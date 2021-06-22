import {dirname, resolve} from "path";
import Database, {AlbumArt, DbAlbum, DbArtist, DbTrack} from "@muzik/database";
import SongScanner from "@muzik/song-scanner";
import {ErrorCode, throwError} from "../lib/error-constants";
import getAverageColour from "../lib/rpc/average-colour/node";
import supportsMimeType from "../lib/rpc/mime-support/node";
import {store} from "./configuration";
import {log} from "./logger";

let db: Database | null = null;
let songScanner: SongScanner | null = null;

export async function initialise(): Promise<void> {
    if (db) throwError(ErrorCode.databaseAlreadyInitialised);
    const path = resolve(dirname(store.path), "database");
    log.info("Creating database in %s", path);
    db = new Database(path);
    await db.initialise();
}

export async function importMusic(
    progress: (percent: number) => void,
    paths: string[] = store.get("musicStore") ?? []
): Promise<void> {
    if (!db) throwError(ErrorCode.databaseNotInitialised);

    // TODO query renderer process to check mime type
    songScanner = new SongScanner(db, {
        async supportsMimeType(type) {
            return supportsMimeType(type);
        },
        getAverageColour(mime, buffer) {
            return getAverageColour(mime, buffer);
        }
    });

    for (const path of paths) {
        songScanner.addDirectory(path);
    }

    songScanner.beginWatching();
    await songScanner.fullSync(progress);
}

export async function updateSongDirectories(
    directories: string[],
    progress?: (percent: number) => void
): Promise<void> {
    const existingDirectories = songScanner.getListenedDirectories();

    for (const directory of directories) {
        if (!existingDirectories.has(directory))
            songScanner.addDirectory(directory);
    }

    for (const existingDirectory of existingDirectories) {
        if (!directories.includes(existingDirectory))
            songScanner.removeDirectory(existingDirectory);
    }

    await songScanner.fullSync(progress);
}

export async function getAlbumArtByHash(
    hash: string
): Promise<AlbumArt | undefined> {
    return db.getAlbumArtByHash(hash);
}

export async function getAlbumArtInfoByHash(
    hash: string
): Promise<Omit<AlbumArt, "source"> | undefined> {
    return db.getAlbumArtInfoByHash(hash);
}

export async function getAllAlbums(): Promise<number[]> {
    return db.getAllAlbums();
}

export async function getAllArtists(): Promise<DbArtist[]> {
    return db.getAllArtists();
}

export function getArtistById(id: number): DbArtist {
    return db.getArtistById(id);
}

export function getAlbumById(id: number): DbAlbum {
    return db.getAlbumById(id);
}

export async function getTrackArtHashByAlbumId(
    albumId: number
): Promise<string[]> {
    return db.getTrackArtHashByAlbumId(albumId);
}

export async function getTracksByAlbumId(albumId: number): Promise<number[]> {
    return db.getTracksByAlbumId(albumId);
}

export async function getSongById(songId: number): Promise<DbTrack> {
    return db.getTrackById(songId);
}

export async function getAllTracks(): Promise<number[]> {
    return db.getAllTrackIds();
}

export function getNamesByTrackId(
    trackId: number
): {[key in "track" | "album" | "artist"]: string} &
    {[key in `${"track" | "album" | "artist"}Sortable`]: string} {
    return db.getNamesByTrackId(trackId);
}

export function getFirstArtistLettersByTrackIds(trackIds: number[]): string[] {
    return db.getFirstArtistLettersByTrackIds(trackIds);
}

export function getFirstArtistLettersByAlbumIds(trackIds: number[]): string[] {
    return db.getFirstArtistLettersByAlbumIds(trackIds);
}
