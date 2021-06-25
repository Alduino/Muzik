import {event} from "../../lib/rpc/get-media-bar-configuration/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useMediaBarConfiguration(): NameResult<typeof event> {
    return useRpc(event, {refetchMultiplier: 10});
}
