import {z} from "zod";
import {trackQueue} from "../../core/TrackQueue.ts";
import {procedure} from "../../trpc.ts";

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
