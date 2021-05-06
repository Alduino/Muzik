import BaseTable from "./BaseTable";

export default interface Track {
    name: string;
    sortableName: string;
    releaseDate: Date | null;
    duration: number;
    trackNo: number | null;
    audioSrcPath: string;
}

export interface DbTrack extends Track, BaseTable {
    albumId: number;
    albumArtHash: string | null;
}
