import {invoke} from "../../ipc/renderer";
import {event, Request, Response} from "./common";

export default function getNames(req: Request): Promise<Response> {
    return invoke(event, req);
}