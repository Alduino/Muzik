import {MethodHandlers} from "../../workers/audio-playback";
import {consumeObservable} from "../utils/observable-rpc.ts";
import {rpc} from "./worker.ts";

export const PREVIOUS_RESTARTS_THRESHOLD_SECONDS = 5;

/**
 * Wraps the worker thread's audio playback engine.
 * Also provides some higher-level functionality.
 */
export class AudioPlaybackEngine {
    readonly seekPosition = consumeObservable<MethodHandlers>()(
        "ape.seekPosition",
        0
    );

    readonly shouldRestartOnPrevious = this.seekPosition.extend(
        seekPosition => seekPosition < PREVIOUS_RESTARTS_THRESHOLD_SECONDS
    );

    /**
     * Seeks to a specific position in the media.
     *
     * @param {number} progress - The position (between zero and one) that the media should seek to.
     */
    async seek(progress: number) {
        await rpc.seek(progress);
    }

    async restart() {
        await this.seek(0);
    }
}

export const audioPlaybackEngine = new AudioPlaybackEngine();
