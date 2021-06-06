import {event} from "../../lib/rpc/get-all-track-ids/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useAllTrackIds(): NameResult<typeof event> {
    return useRpc(event, {refetchMultiplier: 10});
}
