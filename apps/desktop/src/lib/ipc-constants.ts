export const EVENT_DATABASE_INIT = "initialiseDatabase";
export const EVENT_MUSIC_IMPORT = "importMusic";
export const EVENT_SET_MUSIC_PATH = "musicImportPath";

export interface MusicImportRequest {
    /**
     * The requested frequency (in Hertz) to get progress updates
     */
    progressFrequency: number;
}

export interface SetMusicPathRequest {
    path: string;
}
