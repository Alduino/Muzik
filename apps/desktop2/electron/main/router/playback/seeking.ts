import {z} from "zod";
import {audioPlaybackEngine} from "../../core/AudioPlaybackEngine.ts";
import {observable, procedure} from "../../trpc.ts";

export const getCurrentSeekPosition = procedure.subscription(() => {
    return observable.observable<number>(observer => {
        observer.next(audioPlaybackEngine.seekPosition.get());

        return audioPlaybackEngine.seekPosition.onChange(seekPosition => {
            observer.next(seekPosition);
        });
    });
});

export const setCurrentSeekPosition = procedure
    .input(
        z.object({
            seekPosition: z.number().min(0).max(1)
        })
    )
    .mutation(async ({input}) => {
        await audioPlaybackEngine.seek(input.seekPosition);
    });
