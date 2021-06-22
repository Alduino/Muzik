import {handle} from "../../ipc/main";
import {event, Request, Response} from "./common";

export default function handleGetFirstArtistLettersByAlbumIds(cb: (req: Request) => Promise<Response>): void {
    handle(event, cb);
}