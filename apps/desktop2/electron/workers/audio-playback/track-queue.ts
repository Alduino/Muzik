import {ExportedObservables} from "../../main/core/worker.ts";
import {consumeObservable} from "../../main/utils/observable-rpc.ts";

export const trackQueue = {
    currentTrack: consumeObservable<ExportedObservables>()(
        "tq.currentTrack",
        null
    ),
    nextTrack: consumeObservable<ExportedObservables>()("tq.nextTrack", null)
};
