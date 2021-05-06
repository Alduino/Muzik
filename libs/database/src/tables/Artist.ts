import BaseTable from "./BaseTable";

export default interface Artist {
    name: string;
    sortableName: string;
}

export interface DbArtist extends Artist, BaseTable {}
