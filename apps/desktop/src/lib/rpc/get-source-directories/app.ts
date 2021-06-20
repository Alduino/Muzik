import {invoke} from "../../ipc/renderer";
import {event, Response} from "./common";

export default function getSourceDirectories(): Promise<Response> {
    return invoke(event);
}