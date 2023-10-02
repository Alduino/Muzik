import {join} from "path";
import {Worker} from "worker_threads";
import {log} from "../../../shared/logger.ts";
import type {MethodHandlers as WorkerMessageHandlers} from "../../workers/audio-playback";
import {exposeObservable} from "../utils/observable-rpc.ts";
import {createRpc, InferMethods} from "../utils/worker-rpc.ts";
import {trackQueue} from "./TrackQueue.ts";
import {audioStream} from "./audio-stream.ts";
import {loadTrack} from "./loadTrack.ts";

const exposedObservables = {
    ...exposeObservable("tq.currentTrack", trackQueue.currentTrack),
    ...exposeObservable("tq.nextTrack", trackQueue.nextTrack)
};

const messageHandlers = {
    loadTrack,

    nextTrack() {
        trackQueue.next();
    },

    ...audioStream.currentTrackPosition.rpcExtension,
    ...exposedObservables
};

export type MessageHandlers = InferMethods<typeof messageHandlers>;
export type ExportedObservables = InferMethods<typeof exposedObservables>;

const rpcCtrl = createRpc<WorkerMessageHandlers>(messageHandlers);

export const rpc = rpcCtrl.rpc;

let worker: Worker | undefined;

export async function initialiseWorker() {
    if (worker) {
        throw new Error("Worker has already been initialised");
    }

    const workerPath = join(__dirname, "./workers/audio-playback.js");

    log.debug({workerPath}, "Starting audio worker");

    worker = new Worker(workerPath);
    rpcCtrl.attachPort(worker);

    try {
        await new Promise((yay, nay) => {
            worker!.once("online", yay);
            worker!.once("error", nay);
            worker!.once("exit", nay);
        });
    } catch (err) {
        log.fatal({err}, "Failed to start audio worker");
        throw err;
    }

    await rpc.init();
}

export async function terminateWorker() {
    if (!worker) {
        throw new Error("Worker has not been initialised");
    }

    await rpc.prepareForShutdown();
    await worker.terminate();
}
