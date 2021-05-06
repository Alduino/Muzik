import BaseTable from "./BaseTable";

export default interface Album {
    name: string;
    sortableName: string;
}

export interface DbAlbum extends Album, BaseTable {
    artistId: number;
}
