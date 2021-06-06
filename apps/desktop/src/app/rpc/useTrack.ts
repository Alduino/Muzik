import {event} from "../../lib/rpc/get-song/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useTrack(trackId: number): NameResult<typeof event> {
    return useRpc(
        trackId ? event : null,
        {songId: trackId},
        {refetchMultiplier: 10}
    );
}
