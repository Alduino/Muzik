import {parentPort} from "worker_threads";
import {log} from "../../../shared/logger.ts";
import {PLAYBACK_SAMPLE_RATE} from "../../main/constants.ts";
import type {MessageHandlers as MainMessageHandlers} from "../../main/core/worker.ts";
import {exposeObservable} from "../../main/utils/observable-rpc.ts";
import {createRpc, InferMethods} from "../../main/utils/worker-rpc.ts";
import {audioStream} from "./audio-stream.ts";
import {init, prepareForShutdown} from "./init.ts";
import {trackQueue} from "./track-queue.ts";

log.debug("Audio playback worker thread booted");

const exposedObservables = {
    ...exposeObservable("ape.seekPosition", audioStream.currentTrackProgress)
};

const methodHandlers = {
    seek(seconds: number) {
        audioStream.seek(seconds * PLAYBACK_SAMPLE_RATE);
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
