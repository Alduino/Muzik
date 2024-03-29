import {parentPort} from "worker_threads";
import type {MessageHandlers as MainMessageHandlers} from "../../main/core/worker.ts";
import {exposeObservable} from "../../main/utils/observable-rpc.ts";
import {createRpc, InferMethods} from "../../main/utils/worker-rpc.ts";
import {frequencyBinsObservable} from "./audio-playback-engine.ts";
import {audioStream} from "./audio-stream.ts";
import {init, prepareForShutdown} from "./init.ts";
import {log} from "./log.ts";
import {trackQueue} from "./track-queue.ts";

log.debug("Audio playback worker thread booted");

const exposedObservables = {
    ...exposeObservable("ape.seekPosition", audioStream.currentTrackProgress),
    ...exposeObservable("ape.frequencyBins", frequencyBinsObservable)
};

const methodHandlers = {
    seek(progress: number) {
        audioStream.seek(progress);
    },

    init,
    prepareForShutdown,

    importTrackPacket: audioStream.importTrackPacket,

    ...trackQueue.currentTrack.rpcExtension,
    ...trackQueue.nextTrack.rpcExtension,
    ...exposedObservables
};

const rpcCtrl = createRpc<MainMessageHandlers>(methodHandlers);

rpcCtrl.attachPort(parentPort!);

export const rpc = rpcCtrl.rpc;

export type MethodHandlers = InferMethods<typeof methodHandlers>;
export type ExportedObservables = InferMethods<typeof exposedObservables>;
