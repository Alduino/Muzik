import {event} from "../../lib/rpc/album-list/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useAlbumIds(): NameResult<typeof event> {
    return useRpc(event, {refetchMultiplier: 10});
}
