import {Logger} from "roarr";
import {createLogger} from "@muzik/logger";
import pkg from "../../package.json";

export const log: Logger = createLogger(pkg.name, true);
