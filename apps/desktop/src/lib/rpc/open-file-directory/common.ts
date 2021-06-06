import {g} from "../../ipc/common";

export type Response = void;

export interface Request {
    filePath: string;
}

export const event = g<Response, Request>("open-file-directory");
