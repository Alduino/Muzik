import {z} from "zod";
import {audioPlaybackEngine} from "../../core/AudioPlaybackEngine.ts";
import {observable, procedure} from "../../trpc.ts";

export const getCurrentTrack = procedure.subscription(() => {
    return observable.observable<number | null>(observer => {
        observer.next(audioPlaybackEngine.currentTrackId.get());

        return audioPlaybackEngine.currentTrackId.onChange(trackId => {
            observer.next(trackId);
        });
    });
});

export const setCurrentTrack = procedure
    .input(
        z.object({
            trackId: z.number().int().positive()
        })
    )
    .mutation(async ({input}) => {
        audioPlaybackEngine.currentTrackId.set(input.trackId);
    });
