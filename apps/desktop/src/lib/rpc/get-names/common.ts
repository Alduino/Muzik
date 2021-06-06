import {g} from "../../ipc/common";

export interface Response {
    track: string;
    album: string;
    artist: string;
    trackSortable: string;
    albumSortable: string;
    artistSortable: string;
}

export interface Request {
    trackId: number;
}

export const event = g<Response, Request>("get-names");
