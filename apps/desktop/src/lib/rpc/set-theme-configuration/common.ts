import {g} from "../../ipc/common";

export type Response = void;

export interface Request {
    colourMode: "light" | "dark" | "system";
}

export const event = g<Response, Request>("set-theme-configuration");
