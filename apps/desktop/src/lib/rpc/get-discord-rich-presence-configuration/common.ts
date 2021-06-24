import {g} from "../../ipc/common";

export interface Response {
    isEnabled: boolean;
}

export const event = g<Response>("get-discord-rich-presence-configuration");
