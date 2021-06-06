import ExtendedAlbum from "../../ExtendedAlbum";
import {invoke} from "../../ipc/renderer";
import {event} from "./common";

export default function getExtendedAlbum(
    albumId: number
): Promise<ExtendedAlbum> {
    return invoke(event, {albumId});
}
