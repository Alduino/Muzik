import {invoke} from "../../ipc/renderer";
import {event, Request, Response} from "./common";

export default function setPlayState(req: Request): Promise<Response> {
    return invoke(event, req);
}