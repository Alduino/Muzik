import {g} from "../../ipc/common";

export type Response = void;

export interface Request {
    paths: string[];
}

export const event = g<Response, Request>("set-source-directories");
