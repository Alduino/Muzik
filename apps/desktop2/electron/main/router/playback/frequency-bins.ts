import {audioStream} from "../../core/audio-stream.ts";
import {observable, procedure} from "../../trpc.ts";

export const watchFrequencyBins$ = procedure.subscription(() => {
    return observable.observable<Uint32Array>(observer => {
        observer.next(audioStream.frequencyBins.get());

        return audioStream.frequencyBins.onChange(frequencyBins => {
            observer.next(frequencyBins);
        });
    });
});
