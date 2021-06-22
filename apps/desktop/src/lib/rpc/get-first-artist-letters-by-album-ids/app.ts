import {invoke} from "../../ipc/renderer";
import {event, Request, Response} from "./common";

export default function getFirstArtistLettersByAlbumIds(req: Request): Promise<Response> {
    return invoke(event, req);
}