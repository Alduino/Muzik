import {invoke} from "../../ipc/renderer";
import {event, Response} from "./common";

export default function getAllTrackIds(): Promise<Response> {
    return invoke(event);
}