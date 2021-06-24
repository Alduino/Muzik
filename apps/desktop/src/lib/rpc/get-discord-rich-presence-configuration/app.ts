import {invoke} from "../../ipc/renderer";
import {event, Response} from "./common";

export default function getDiscordRichPresenceConfiguration(): Promise<Response> {
    return invoke(event);
}
