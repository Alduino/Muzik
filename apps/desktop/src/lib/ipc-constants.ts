import {DbArtist} from "@muzik/database";
import {g} from "./ipc/common";

export const EVENT_DATABASE_INIT = g<void>("database init");
export const EVENT_MUSIC_IMPORT = g<void, MusicImportRequest, number>(
    "music import"
);
export const EVENT_SELECT_MUSIC_IMPORT_PATH = g<boolean>(
    "select music import path"
);
export const EVENT_REDUX_DEV_TOOLS_ENABLED = g<boolean>(
    "redux dev tools enabled",
    true
);
export const EVENT_CLIPBOARD_WRITE = g<void, WriteClipboardRequest>(
    "clipboard write"
);
export const EVENT_APP_STATE_GET = g<AppStateValue>("app state get");
export const EVENT_APP_STATE_SET = g<void, AppStateValue>("app state set");
export const EVENT_ARTIST_LIST = g<ArtistListResponse>("artist list");

export interface AppStateValue {
    shuffled: boolean;
    repeatMode: number;
    nowPlaying: number;
    upNext: number[];
    songs: number[];
    route: number;
    albumArtIsLarge: boolean;
    volume: number;
}

export interface MusicImportRequest {
    /**
     * The requested frequency (in Hertz) to get progress updates
     */
    progressFrequency?: number;
}

export interface WriteClipboardRequest {
    text?: string;
    html?: string;
    rtf?: string;
    bookmark?: string;
}

export interface ArtistListResponse {
    artists: DbArtist[];
}
