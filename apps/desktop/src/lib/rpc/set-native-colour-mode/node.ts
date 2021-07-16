import {invoke} from "../../ipc/main";
import {Target} from "../../window-ids";
import {event, Request, Response} from "./common";

export default function setNativeColourMode(
    req: Request,
    target = Target.main
): Promise<Response> {
    return invoke(target)(event, req);
}
