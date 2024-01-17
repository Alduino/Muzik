import {childLogger as createLogger} from "../../../shared/logger.ts";

const log = createLogger("api");
export const childLogger = log.child.bind(log);
