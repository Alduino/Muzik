import {handle} from "../../ipc/main";
import {event} from "./common";

export default function handleGetAlbumList(cb: () => Promise<number[]>): void {
    handle(event, () => cb().then(albumIds => ({albumIds})));
}
