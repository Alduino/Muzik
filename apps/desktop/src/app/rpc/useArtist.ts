import {event} from "../../lib/rpc/get-artist/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useArtist(artistId: number): NameResult<typeof event> {
    return useRpc(artistId ? event : null, {artistId}, {refetchMultiplier: 10});
}
