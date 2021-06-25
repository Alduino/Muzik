import {g} from "../../ipc/common";
import {Request} from "../set-theme-configuration/common";

export type Response = Request;

export const event = g<Response>("get-theme-configuration");
