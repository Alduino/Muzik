import {DbArtist} from "@muzik/database";
import {g} from "../../ipc/common";

export type Response = DbArtist;

export interface Request {
    artistId: number;
}

export const event = g<Response, Request>("get-artist");
