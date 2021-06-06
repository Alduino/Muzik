import {event} from "../../lib/rpc/get-album-track-ids/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useAlbumTrackIds(
    albumId: number
): NameResult<typeof event> {
    return useRpc(albumId ? event : null, {albumId}, {refetchMultiplier: 10});
}
