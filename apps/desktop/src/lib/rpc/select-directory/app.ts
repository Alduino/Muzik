import {invoke} from "../../ipc/renderer";
import {event, Response} from "./common";

export default function selectDirectory(): Promise<Response> {
    return invoke(event);
}