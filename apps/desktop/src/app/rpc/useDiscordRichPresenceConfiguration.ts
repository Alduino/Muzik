import {event} from "../../lib/rpc/get-discord-rich-presence-configuration/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useDiscordRichPresenceConfiguration(): NameResult<
    typeof event
> {
    return useRpc(event, {refetchMultiplier: 10});
}
