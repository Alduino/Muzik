import {log} from "../../../shared/logger.ts";
import {initialiseWorker} from "./worker.ts";

export async function startAudioPlaybackEngine() {
    log.info("Starting audio engine");

    await initialiseWorker();
}
