import {g} from "../../ipc/common";

interface Request {
    mimeType: string;
}

interface Response {
    supported: boolean;
}

export const event = g<Response, Request>("mime-support");
