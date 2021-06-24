import {g} from "../../ipc/common";

export type Response = void;

export interface Request {
    isEnabled: boolean;
}

export const event = g<Response, Request>(
    "set-discord-rich-presence-configuration"
);
