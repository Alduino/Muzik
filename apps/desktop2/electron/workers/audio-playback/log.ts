import {childLogger} from "../../../shared/logger.ts";

const workerLog = childLogger("audio-thread");
const workerChildLog = workerLog.child.bind(workerLog);

export {workerLog as log, workerChildLog as childLogger};
