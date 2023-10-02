import {log} from "../../../shared/logger.ts";
import {cleanupSpeaker, createSpeaker} from "./audio-playback-engine.ts";
import {connectToTrackQueue} from "./audio-stream.ts";

export function init() {
    createSpeaker();
    connectToTrackQueue();
}

export function prepareForShutdown() {
    log.info("Preparing audio playback worker thread for shutdown");

    cleanupSpeaker();
}
