import {g} from "../../ipc/common";

export type Response = string[];

export interface Request {
    albumIds: number[];
}

export const event = g<Response, Request>(
    "get-first-artist-letters-by-album-ids"
);
