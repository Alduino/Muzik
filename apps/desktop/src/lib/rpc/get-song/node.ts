import {handle} from "../../ipc/main";
import {event, Request, Response} from "./common";

export default function handleGetSong(cb: (req: Request) => Promise<Response>): void {
    handle(event, cb);
}