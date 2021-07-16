import {handle} from "../../ipc/renderer";
import {event, Request, Response} from "./common";

export default function handleSetNativeColourMode(
    cb: (req: Request) => Promise<Response>
): void {
    handle(event, cb);
}
