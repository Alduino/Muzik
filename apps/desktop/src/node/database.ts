import {resolve, dirname} from "path";
import {Database} from "@muzik/database";
import scan from "@muzik/song-scanner";
import {Album, Song} from "@muzik/database";
import {store} from "./configuration";
import {ErrorCode, throwError} from "../lib/error-constants";
import {hostname as albumArtHost} from "./album-art-server";

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

function exposeAlbum(album: Album, exposed: boolean) {
    if (!exposed) return album;

    return {
        ...album,
        art: album.art && {
            ...album.art,
            path: `${albumArtHost}/${album.id}`
        }
    };
}

export async function getAllAlbums(exposed = true): Promise<Album[]> {
    const albums = await db.getAllAlbums();
    return albums.map(album => exposeAlbum(album, exposed));
}

export async function getSongsByAlbum(
    albumId: number,
    exposed = true
): Promise<Song[]> {
    const songs = await db.getMatchingSongs({
        albumId: v => albumId === parseInt(v)
    });
    return songs.map(song => ({
        ...song,
        album: exposeAlbum(song.album, exposed)
    }));
}

export async function getSongById(
    songId: number,
    exposed = true
): Promise<Song> {
    const song = await db.getSong(songId);
    return {
        ...song,
        album: exposeAlbum(song.album, exposed)
    };
}

export function getAlbumById(albumId: number, exposed = true): Promise<Album> {
    return db.getAlbum(albumId).then(res => exposeAlbum(res, exposed));
}
