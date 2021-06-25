import {g} from "../../ipc/common";
import {Request} from "../set-media-bar-configuration/common";

export type Response = Request;

export const event = g<Response>("get-media-bar-configuration");
