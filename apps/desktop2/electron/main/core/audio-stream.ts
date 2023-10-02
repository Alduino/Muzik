import type {MethodHandlers as WorkerMessageHandlers} from "../../workers/audio-playback";
import {consumeObservable} from "../utils/observable-rpc.ts";
import {rpc} from "./worker.ts";

export const audioStream = {
    currentTrackPosition: consumeObservable<WorkerMessageHandlers>()(
        "ape.seekPosition",
        0
    ),
    async seek(seekPosition: number) {
        await rpc.seek(seekPosition);
    }
};
