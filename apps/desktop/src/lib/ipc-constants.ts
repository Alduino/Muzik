import {Album, Song} from "@muzik/database";

export const EVENT_DATABASE_INIT = "initialiseDatabase";
export const EVENT_MUSIC_IMPORT = "importMusic";
export const EVENT_SELECT_MUSIC_IMPORT_PATH = "selectMusicImportPath";
export const EVENT_ALBUM_LIST = "listAlbums";
export const EVENT_ALBUM_SONGS = "albumSongs";
export const EVENT_GET_SONG = "getSong";

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

export interface AlbumListResponse {
    albums: Album[];
}

export interface AlbumSongsResponse {
    songs: Song[];
}

export interface GetSongResponse {
    song: Song;
}
