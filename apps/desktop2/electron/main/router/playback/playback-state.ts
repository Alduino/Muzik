import {z} from "zod";
import {audioPlaybackEngine} from "../../core/AudioPlaybackEngine.ts";
import {procedure} from "../../trpc.ts";

export const play = procedure
    .input(
        z.object({
            trackId: z.number().int().positive().optional()
        })
    )
    .mutation(async ({input}) => {
        if (input.trackId) {
            audioPlaybackEngine.currentTrackId.set(input.trackId);
        }

        await audioPlaybackEngine.play();
    });
