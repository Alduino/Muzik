import {z} from "zod";
import {trackQueue} from "../../core/TrackQueue.ts";
import {observable, procedure} from "../../trpc.ts";

export const play = procedure
    .input(
        z.object({
            trackId: z.number().int().positive().optional()
        })
    )
    .mutation(async ({input}) => {
        if (input.trackId !== undefined) {
            trackQueue.unshiftToImmediateQueue(input.trackId);
            trackQueue.next();
        }

        // TODO
    });

export const isPlaying$ = procedure.subscription(() => {
    return observable.observable<boolean>(observer => {
        // No concept of pausing atm so always true
        observer.next(true);
    });
})
