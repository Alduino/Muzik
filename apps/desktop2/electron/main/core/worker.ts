import {join} from "path";
import {Worker} from "worker_threads";
import {childLogger} from "../../../shared/logger.ts";
import type {MethodHandlers as WorkerMessageHandlers} from "../../workers/audio-playback";
import {exposeObservable} from "../utils/observable-rpc.ts";
import {createRpc, InferMethods} from "../utils/worker-rpc.ts";
import {trackQueue} from "./TrackQueue.ts";
import {audioStream} from "./audio-stream.ts";
import {loadTrack} from "./loadTrack.ts";
import {readStreamManager} from "./read-stream-manager.ts";

const log = childLogger("audio-worker-iface");

const exposedObservables = {
    ...exposeObservable("tq.currentTrack", trackQueue.currentTrack),
    ...exposeObservable("tq.nextTrack", trackQueue.nextTrack)
};

const messageHandlers = {
    loadTrack,

    nextTrack() {
        trackQueue.next();
    },

    requestTrackPacket: readStreamManager.requestTrackPacket,

    ...audioStream.currentTrackPosition.rpcExtension,
    ...audioStream.frequencyBins.rpcExtension,
    ...exposedObservables
};

export type MessageHandlers = InferMethods<typeof messageHandlers>;
export type ExportedObservables = InferMethods<typeof exposedObservables>;

const rpcCtrl = createRpc<WorkerMessageHandlers>(messageHandlers);

export const rpc = rpcCtrl.rpc;

let worker: Worker | undefined, killingWorker = false;

export async function initialiseWorker() {
    if (worker) {
        throw new Error("Worker has already been initialised");
    }

    const workerPath = join(__dirname, "./workers/audio-playback.js");

    log.debug({workerPath}, "Starting audio worker");

    killingWorker = false;
    worker = new Worker(workerPath);
    rpcCtrl.attachPort(worker);

    log.debug("Waiting for worker to come online");

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

    let canRestartWorker = false;

    worker.once("error", async err => {
        if (killingWorker) return;

        if (canRestartWorker) {
            log.warn(err, "Audio worker crashed, attempting to restart");

            if (worker) {
                log.debug("Terminating old audio worker");
                await worker.terminate();
                worker = undefined;
            }

            await initialiseWorker();
        } else {
            log.fatal({err}, "Audio worker crashed");

            // TODO: show error to user
            process.exit(1);
        }
    });

    log.debug("Initialising audio worker");
    await rpc.init();
    canRestartWorker = true;

    log.debug("Audio worker initialised");
}

export async function terminateWorker() {
    if (!worker) {
        throw new Error("Worker has not been initialised");
    }

    try {
        await rpc.withOptions({timeout: 500}).prepareForShutdown();
    } catch (err) {
        log.warn({err}, "Failed to prepare audio worker for shutdown");
    }

    killingWorker = true;
    await worker.terminate();
}
