import {event} from "../../lib/rpc/extended-album/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useExtendedAlbum(
    albumId: number
): NameResult<typeof event> {
    return useRpc(albumId ? event : null, {albumId}, {refetchMultiplier: 10});
}
