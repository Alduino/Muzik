import {handle} from "../../ipc/main";
import {event, Response} from "./common";

export default function handleGetSourceDirectories(cb: () => Promise<Response>): void {
    handle(event, cb);
}