export const EVENT_DATABASE_INIT = "initialiseDatabase";
export const EVENT_MUSIC_IMPORT = "importMusic";
export const EVENT_SELECT_MUSIC_IMPORT_PATH = "selectMusicImportPath";

export interface MusicImportRequest {
    /**
     * The requested frequency (in Hertz) to get progress updates
     */
    progressFrequency: number;
}
