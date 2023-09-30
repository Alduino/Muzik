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
