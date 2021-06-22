import {g} from "../../ipc/common";

export type Response = string[];

export interface Request {
    trackIds: number[];
}

export const event = g<Response, Request>(
    "get-first-artist-letters-by-track-ids"
);
