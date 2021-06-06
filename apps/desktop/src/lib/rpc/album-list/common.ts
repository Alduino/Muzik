import {g} from "../../ipc/common";

interface Response {
    albumIds: number[];
}

export const event = g<Response>("album-list");
