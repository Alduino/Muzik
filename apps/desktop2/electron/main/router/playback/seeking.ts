import {z} from "zod";
import {audioStream} from "../../core/audio-stream.ts";
import {observable, procedure} from "../../trpc.ts";

export const getCurrentSeekPosition = procedure.subscription(() => {
    return observable.observable<number>(observer => {
        observer.next(audioStream.currentTrackPosition.get());

        return audioStream.currentTrackPosition.onChange(seekPosition => {
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
        await audioStream.seek(input.seekPosition);
    });
