import pkg from "../../package._IGNORED.json";
import {createLogger, Logger} from "@muzik/logger";

export const log: Logger = createLogger(pkg.name, true);
