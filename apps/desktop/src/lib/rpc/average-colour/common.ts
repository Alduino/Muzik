import {g} from "../../ipc/common";

interface Request {
    data: Uint8Array;
    mimeType: string;
}

interface Response {
    colour: string;
}

export const event = g<Response, Request>("average-colour");
