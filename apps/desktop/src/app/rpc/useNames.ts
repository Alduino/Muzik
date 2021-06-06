import {event} from "../../lib/rpc/get-names/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useNames(trackId: number): NameResult<typeof event> {
    return useRpc(trackId ? event : null, {trackId}, {refetchMultiplier: 10});
}
