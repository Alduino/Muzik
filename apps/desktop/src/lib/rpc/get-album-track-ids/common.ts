import {g} from "../../ipc/common";

export interface Response {
    trackIds: number[];
}

export interface Request {
    albumId: number;
}

export const event = g<Response, Request>("get-album-track-ids");
