import {event} from "../../lib/rpc/get-source-directories/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useSourceDirectories(): NameResult<typeof event> {
    return useRpc(event, {refetchMultiplier: 10});
}
