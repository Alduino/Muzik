import {parentPort} from "worker_threads";
import {log} from "../../../shared/logger.ts";
import type {MessageHandlers as MainMessageHandlers} from "../../main/core/worker.ts";
import {exposeObservable} from "../../main/utils/observable-rpc.ts";
import {createRpc, InferMethods} from "../../main/utils/worker-rpc.ts";
import {audioPlaybackEngine} from "./audio-playback-engine.ts";
import {audioTrackBuffer} from "./audio-track-buffer.ts";

log.debug("Audio playback worker thread booted");

const methodHandlers = {
    setBufferedTrack: audioTrackBuffer.setBufferedTrack,
    deleteBufferedTrack: audioTrackBuffer.deleteBufferedTrack,
    seek: audioPlaybackEngine.seek,
    ...exposeObservable("ape.seekPosition", audioPlaybackEngine.seekPosition)
};

const rpcCtrl = createRpc<MainMessageHandlers>(methodHandlers);

rpcCtrl.attachPort(parentPort!);

export const rpc = rpcCtrl.rpc;

export type MethodHandlers = InferMethods<typeof methodHandlers>;
