import {Logger} from "roarr";
import {createLogger} from "@muzik/logger";
import {ROARR} from "roarr";
import pkg from "../package.json";

export const log: Logger = createLogger(pkg.name, true);

if (typeof window !== "undefined") {
    ROARR.write = console.log;
}
