import {invoke} from "../../ipc/renderer";
import {event, Response} from "./common";

export default function getMediaBarConfiguration(): Promise<Response> {
    return invoke(event);
}