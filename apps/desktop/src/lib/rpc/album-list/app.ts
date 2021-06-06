import {invoke} from "../../ipc/renderer";
import {event} from "./common";

export default function getAlbumList(): Promise<number[]> {
    return invoke(event).then(({albumIds}) => albumIds);
}
