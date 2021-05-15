import {dirname, resolve} from "path";
import Database, {AlbumArt, DbAlbum, DbArtist, DbTrack} from "@muzik/database";
import SongScanner from "@muzik/song-scanner";
import {store} from "./configuration";
import {ErrorCode, throwError} from "../lib/error-constants";
import {log} from "./logger";
import supportsMimeType from "../lib/rpc/mime-support/node";
import getAverageColour from "../lib/rpc/average-colour/node";

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
    path: string = store.get("musicStore")
): Promise<void> {
    if (!db) throwError(ErrorCode.databaseNotInitialised);
    if (path === null) throwError(ErrorCode.musicStoreNotPicked);

    // TODO query renderer process to check mime type
    const scanner = new SongScanner(db, {
        async supportsMimeType(type) {
            return supportsMimeType(type);
        },
        getAverageColour(mime, buffer) {
            return getAverageColour(mime, buffer);
        }
    });

    scanner.addDirectory(path);
    scanner.beginWatching();
    await scanner.fullSync(progress);

    songScanner = scanner;
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

export async function getAllAlbums(): Promise<DbAlbum[]> {
    return db.getAllAlbums();
}

export async function getAllArtists(): Promise<DbArtist[]> {
    return db.getAllArtists();
}

export async function getTrackArtHashByAlbumId(
    albumId: number
): Promise<string[]> {
    return db.getTrackArtHashByAlbumId(albumId);
}

export async function getSongsByAlbumId(albumId: number): Promise<DbTrack[]> {
    return db.getTracksByAlbumId(albumId);
}

export async function getSongById(songId: number): Promise<DbTrack> {
    return db.getTrackById(songId);
}

export async function getAllTracks(): Promise<
    (DbTrack & Omit<AlbumArt, "source">)[]
> {
    return db.getAllTracks();
}

export function getNamesByTrackId(trackId: number) {
    return db.getNamesByTrackId(trackId);
}
