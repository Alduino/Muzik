import {g} from "../../ipc/common";

export type Response = void;

export type Request = "light" | "dark";

export const event = g<Response, Request>("set-native-colour-mode");
