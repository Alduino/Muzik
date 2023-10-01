import {join} from "path";
import {Worker} from "worker_threads";
import {log} from "../../../shared/logger.ts";
import type {MethodHandlers as WorkerMessageHandlers} from "../../workers/audio-playback";
import {createRpc, InferMethods} from "../utils/worker-rpc.ts";
import {audioPlaybackEngine} from "./AudioPlaybackEngine.ts";
import {audioTrackBuffer} from "./AudioTrackBuffer.ts";

const messageHandlers = {
    /**
     * Buffers a track for quick access later.
     *
     * This RPC call is hard-coded with `canThrow` set to `true`.
     *
     * You **MUST** call `unloadTrack` when you're done with the track (in a `finally`).
     * Otherwise, there will be a severe memory leak.
     */
    async loadTrack(trackId: number) {
        await audioTrackBuffer.loadTrack(trackId, true);
    },

    /**
     * Decrements the reference count of a track, that is incremented by `loadTrack`.
     * If the reference count reaches zero, the track is unloaded.
     */
    unloadTrack(trackId: number) {
        audioTrackBuffer.unloadTrack(trackId);
    },

    ...audioPlaybackEngine.seekPosition.rpcExtension
};

export type MessageHandlers = InferMethods<typeof messageHandlers>;

const rpcCtrl = createRpc<WorkerMessageHandlers>(messageHandlers);

export const rpc = rpcCtrl.rpc;

export function initialiseWorker() {
    const workerPath = join(__dirname, "./workers/audio-playback.js");

    log.debug({workerPath}, "Starting audio worker");

    const worker = new Worker(workerPath);
    rpcCtrl.attachPort(worker);

    return new Promise((yay, nay) => {
        worker.once("online", yay);
        worker.once("error", nay);
    });
}
