import {ExtendedTrack} from "../../ExtendedAlbum";
import {g} from "../../ipc/common";

export type Response = ExtendedTrack;

export interface Request {
    songId: number;
}

export const event = g<Response, Request>("get-song");
