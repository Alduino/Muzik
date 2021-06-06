import {g} from "../../ipc/common";

export interface Response {
    trackIds: number[];
}

export const event = g<Response>("get-all-track-ids");
