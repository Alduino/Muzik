import {handle} from "../../ipc/main";
import {event, Request, Response} from "./common";

export default function handleSetMediaBarConfiguration(cb: (req: Request) => Promise<Response>): void {
    handle(event, cb);
}