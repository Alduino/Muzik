import {cleanupSpeaker, createSpeaker} from "./audio-playback-engine.ts";
import {connectToTrackQueue} from "./audio-stream.ts";
import {log} from "./log.ts";

export function init() {
    createSpeaker();
    connectToTrackQueue();
}

export function prepareForShutdown() {
    log.info("Preparing audio playback worker thread for shutdown");

    cleanupSpeaker();
}
