import {handle} from "../../ipc/main";
import {event, Request, Response} from "./common";

export default function handleOpenFileDirectory(cb: (req: Request) => Promise<Response>): void {
    handle(event, cb);
}