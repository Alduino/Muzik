import {event} from "../../lib/rpc/get-theme-configuration/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useThemeConfiguration(): NameResult<typeof event> {
    return useRpc(event, {refetchMultiplier: 60});
}
