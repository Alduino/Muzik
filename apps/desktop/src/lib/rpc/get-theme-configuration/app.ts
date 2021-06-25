import {invoke} from "../../ipc/renderer";
import {event, Response} from "./common";

export default function getThemeConfiguration(): Promise<Response> {
    return invoke(event);
}