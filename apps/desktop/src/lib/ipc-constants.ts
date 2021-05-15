import {DbArtist} from "@muzik/database";
import {g} from "./ipc/common";
import ExtendedAlbum, {ExtendedTrack} from "./ExtendedAlbum";

export const EVENT_DATABASE_INIT = g<void>("database init");
export const EVENT_MUSIC_IMPORT = g<void, MusicImportRequest, number>(
    "music import"
);
export const EVENT_SELECT_MUSIC_IMPORT_PATH = g<boolean>(
    "select music import path"
);
export const EVENT_ALBUM_LIST = g<AlbumListResponse>("album list", true);
export const EVENT_ALBUM_SONGS = g<AlbumSongsResponse, AlbumSongsRequest>(
    "album songs",
    true
);
export const EVENT_GET_SONG = g<GetSongResponse, GetSongRequest>(
    "get song",
    true
);
export const EVENT_REDUX_DEV_TOOLS_ENABLED = g<boolean>(
    "redux dev tools enabled",
    true
);
export const EVENT_GET_ALL_TRACKS = g<GetAllTracksResponse>(
    "get all tracks",
    true
);
export const EVENT_CLIPBOARD_WRITE = g<void, WriteClipboardRequest>(
    "clipboard write"
);
export const EVENT_FILEDIR_OPEN = g<void, FiledirOpenRequest>("filedir open");
export const EVENT_APP_STATE_GET = g<AppStateValue>("app state get");
export const EVENT_APP_STATE_SET = g<void, AppStateValue>("app state set");
export const EVENT_ARTIST_LIST = g<ArtistListResponse>("artist list", true);
export const EVENT_GET_NAMES = g<GetNamesResponse, GetNamesRequest>(
    "get album by id",
    true
);

export interface AppStateValue {
    shuffled: boolean;
    repeatMode: number;
    nowPlaying: number;
    upNext: number[];
    songs: number[];
    route: number;
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

export interface GetNamesRequest {
    trackId: number;
}

export interface AlbumListResponse {
    albums: ExtendedAlbum[];
}

export interface AlbumSongsResponse {
    songs: ExtendedTrack[];
}

export interface GetSongResponse {
    song: ExtendedTrack;
}

export interface GetAllTracksResponse {
    tracks: ExtendedTrack[];
}

export interface ArtistListResponse {
    artists: DbArtist[];
}

export interface GetNamesResponse {
    track: string;
    album: string;
    artist: string;
    trackSortable: string;
    albumSortable: string;
    artistSortable: string;
}
