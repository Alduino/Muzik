import {g} from "../../ipc/common";

export interface Response {
    path: string;
}

export const event = g<Response>("select-directory");
