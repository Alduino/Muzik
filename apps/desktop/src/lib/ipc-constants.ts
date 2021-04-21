import {Album, Song} from "@muzik/database";
import type {IpcName} from "./ipc/common";

function g<TResponse, TRequest = never, TProgress = never>(
    name: string
): IpcName<TResponse, TRequest, TProgress> {
    return [name];
}

export const EVENT_DATABASE_INIT = g<void>("database init");
export const EVENT_MUSIC_IMPORT = g<void, MusicImportRequest, number>(
    "music import"
);
export const EVENT_SELECT_MUSIC_IMPORT_PATH = g<boolean>(
    "select music import path"
);
export const EVENT_ALBUM_LIST = g<AlbumListResponse>("album list");
export const EVENT_ALBUM_SONGS = g<AlbumSongsResponse, AlbumSongsRequest>(
    "album songs"
);
export const EVENT_GET_SONG = g<GetSongResponse, GetSongRequest>("get song");
export const EVENT_REDUX_DEV_TOOLS_ENABLED = g<boolean>(
    "redux dev tools enabled"
);
export const EVENT_GET_ALL_SONG_IDS = g<GetAllSongIdsResponse>(
    "get all song ids"
);
export const EVENT_CLIPBOARD_WRITE = g<void, WriteClipboardRequest>(
    "clipboard write"
);
export const EVENT_FILEDIR_OPEN = g<void, FiledirOpenRequest>("filedir open");
export const EVENT_APP_STATE_GET = g<AppStateValue>("app state get");
export const EVENT_APP_STATE_SET = g<void, AppStateValue>("app state set");

export interface AppStateValue {
    shuffled: boolean;
    repeatMode: number;
    nowPlaying: number;
    songs: number[];
}

export interface MusicImportRequest {
    /**
     * The requested frequency (in Hertz) to get progress updates
     */
    progressFrequency: number;
}

export interface AlbumSongsRequest {
    albumId: number;
}

export interface GetSongRequest {
    songId: number;
}

export interface WriteClipboardRequest {
    text?: string;
    html?: string;
    rtf?: string;
    bookmark?: string;
}

export interface FiledirOpenRequest {
    path: string;
}

export interface AlbumListResponse {
    albums: Album[];
}

export interface AlbumSongsResponse {
    songs: Song[];
}

export interface GetSongResponse {
    song: Song;
}

export interface GetAllSongIdsResponse {
    songIds: number[];
}
