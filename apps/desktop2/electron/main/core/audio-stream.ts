import type {MethodHandlers as WorkerMessageHandlers} from "../../workers/audio-playback";
import {consumeObservable} from "../utils/observable-rpc.ts";
import {rpc} from "./worker.ts";

export const audioStream = {
    currentTrackPosition: consumeObservable<WorkerMessageHandlers>()(
        "ape.seekPosition",
        0
    ),
    frequencyBins: consumeObservable<WorkerMessageHandlers>()(
        "ape.frequencyBins",
        new Uint32Array(2048).fill(0)
    ),
    async seek(seekPosition: number) {
        await rpc.seek(seekPosition);
    }
};
