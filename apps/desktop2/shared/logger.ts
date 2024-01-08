import {createLogger} from "@muzik/logger";

export const log = createLogger("@muzik/desktop");

export const childLogger = log.child.bind(log);
