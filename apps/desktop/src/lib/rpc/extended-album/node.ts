import ExtendedAlbum from "../../ExtendedAlbum";
import {handle} from "../../ipc/main";
import {event} from "./common";

export default function handleGetExtendedAlbum(
    cb: (id: number) => Promise<ExtendedAlbum>
): void {
    handle(event, req => cb(req.albumId));
}
