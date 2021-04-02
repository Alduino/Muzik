import {Logger} from "roarr";
import {createLogger} from "@muzik/logger";
import {name} from "../package.json";

export const log: Logger = createLogger(name, true);
