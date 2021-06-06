import ExtendedAlbum from "../../ExtendedAlbum";
import {g} from "../../ipc/common";

export interface Request {
    albumId: number;
}

export type Response = ExtendedAlbum;

export const event = g<Response, Request>("extended-album");
