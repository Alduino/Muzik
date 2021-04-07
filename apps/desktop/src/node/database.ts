import {resolve, dirname} from "path";
import {Database} from "@muzik/database";
import scan from "@muzik/song-scanner";
import {store} from "./configuration";
import {ErrorCode, throwError} from "../lib/error-constants";
import {Album, Song} from "@muzik/database";

let db: Database | null = null;

export async function initialise(): Promise<void> {
    if (db) throwError(ErrorCode.databaseAlreadyInitialised);
    const path = resolve(dirname(store.path), "database");
    db = await Database.create(path);
    await db.initialise();
}

export function importMusic(
    progress: (percent: number) => void,
    path: string = store.get("musicStore")
): Promise<void> {
    if (!db) throwError(ErrorCode.databaseNotInitialised);
    if (path === null) throwError(ErrorCode.musicStoreNotPicked);
    return scan(db, path, progress);
}

export async function getAllAlbums(): Promise<Album[]> {
    const albums = await db.getAllAlbums();
    const substringAmnt = store.get("musicStore").length;
    return albums.map(album => ({
        ...album,
        artPath: album.artPath?.substring(substringAmnt)
    }));
}

export async function getSongsByAlbum(albumId: number): Promise<Song[]> {
    const songs = await db.getMatchingSongs({
        albumId: v => albumId === parseInt(v)
    });
    const substringAmnt = store.get("musicStore").length;
    return songs.map(song => ({
        ...song,
        album: {
            ...song.album,
            artPath: song.album.artPath?.substring(substringAmnt)
        }
    }));
}
