import {invoke} from "../../ipc/renderer";
import {event, Request, Response} from "./common";

export default function setMediaBarConfiguration(req: Request): Promise<Response> {
    return invoke(event, req);
}