import {trackQueue} from "../../core/TrackQueue.ts";
import {observable, procedure} from "../../trpc.ts";

export const getCurrentTrack = procedure.subscription(() => {
    return observable.observable<number | null>(observer => {
        observer.next(trackQueue.currentTrack.get());

        return trackQueue.currentTrack.onChange(trackId => {
            observer.next(trackId);
        });
    });
});
