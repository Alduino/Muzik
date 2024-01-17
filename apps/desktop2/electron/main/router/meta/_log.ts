import {childLogger as createLogger} from "../_log.ts";

const log = createLogger("comms");
export const childLogger = log.child.bind(log);
