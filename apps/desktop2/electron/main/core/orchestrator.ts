import {log} from "../../../shared/logger.ts";
import {addTrackReadStreamListeners} from "./read-stream-manager.ts";
import {initialiseWorker} from "./worker.ts";

export async function startAudioPlaybackEngine() {
    log.info("Starting audio engine");

    addTrackReadStreamListeners();
    await initialiseWorker();
}
