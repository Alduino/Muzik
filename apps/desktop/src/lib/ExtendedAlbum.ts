import {DbAlbum, DbTrack} from "@muzik/database";

export default interface ExtendedAlbum extends DbAlbum {
    art?: {
        url: string;
        mime: string;
        avgColour: string;
    };
}

export interface ExtendedTrack extends DbTrack {
    art?: {
        url: string;
        mime: string;
        avgColour: string;
    };
}
