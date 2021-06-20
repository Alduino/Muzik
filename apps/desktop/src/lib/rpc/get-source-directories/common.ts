import {g} from "../../ipc/common";

export type Response = string[];

export const event = g<Response>("get-source-directories");
