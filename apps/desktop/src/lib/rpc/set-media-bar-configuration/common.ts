import {g} from "../../ipc/common";

export type Response = void;

export interface Request {
    position: "top" | "bottom";
}

export const event = g<Response, Request>("set-media-bar-configuration");
